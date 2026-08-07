import re
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.database import get_db_connection
from app.schemas.models import (
    JobPostRequest, JobApplyRequest, TailorPreviewRequest, ApplyConfirmRequest
)
from app.tools.google_calendar import create_event_with_reminder

router = APIRouter(tags=["Jobs & Placement Drives"])

@router.post("/api/jobs")
def post_job(req: JobPostRequest):
    now = datetime.now().isoformat()
    calendar_link = None

    if req.create_calendar_event:
        try:
            start_dt = datetime.now() + timedelta(days=2)
            summary = f"Placement Drive: {req.title} ({req.company})"
            cal_res = create_event_with_reminder(summary=summary, start_dt=start_dt, duration_minutes=120)
            if cal_res.get("success"):
                calendar_link = cal_res.get("link")
        except Exception as e:
            print(f"[Calendar] Event creation skipped: {e}")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO jobs (title, company, description, requirements, branch, posted_by, created_at, calendar_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (req.title, req.company, req.description, req.requirements, req.branch, req.posted_by, now, calendar_link)
    )
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()

    msg = f"Job '{req.title}' posted successfully."
    if calendar_link:
        msg += " Google Calendar event added!"

    return {"status": "success", "job_id": job_id, "calendar_link": calendar_link, "message": msg}

@router.get("/api/jobs")
def list_jobs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT j.*, COUNT(ja.id) as applicant_count
        FROM jobs j
        LEFT JOIN job_applications ja ON j.id = ja.job_id
        GROUP BY j.id
        ORDER BY j.id DESC
    """)
    jobs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"jobs": jobs}

@router.post("/api/jobs/tailor-preview")
def tailor_resume_preview(req: TailorPreviewRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id=?", (req.job_id,))
    job_row = cursor.fetchone()
    if not job_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found.")
    job = dict(job_row)

    cursor.execute("SELECT id FROM job_applications WHERE job_id=? AND student_id=?", (req.job_id, req.student_id))
    if cursor.fetchone():
        conn.close()
        return {
            "status": "already_applied",
            "message": f"You have already applied for {job['title']} at {job['company']}."
        }

    cursor.execute("SELECT id FROM resumes WHERE student_id=?", (req.student_id,))
    res_row = cursor.fetchone()
    conn.close()

    if not res_row:
        return {
            "status": "error",
            "message": "No resume found on file. Please upload a PDF or DOCX resume in the Resume Profile tab first."
        }

    from app.tools.attendance_tool import generate_tailored_resume
    tailored_filename, match_score, matched_skills = generate_tailored_resume(req.student_id, job)

    return {
        "status": "success",
        "job_id": req.job_id,
        "job_title": job["title"],
        "company": job["company"],
        "tailored_file": tailored_filename,
        "tailored_url": f"/api/resume/tailored/{tailored_filename}",
        "match_score": match_score,
        "matched_skills": matched_skills,
        "message": "ATS Tailored Resume preview generated! Review and confirm to submit."
    }

@router.post("/api/jobs/apply-confirm")
def confirm_job_application(req: ApplyConfirmRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM job_applications WHERE job_id=? AND student_id=?", (req.job_id, req.student_id))
    if cursor.fetchone():
        conn.close()
        return {"status": "already_applied", "message": "Application has already been submitted."}

    cursor.execute("SELECT id FROM resumes WHERE student_id=?", (req.student_id,))
    rrow = cursor.fetchone()
    resume_id = rrow["id"] if rrow else None

    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO job_applications (job_id, student_id, resume_id, status, applied_at, tailored_resume_path) VALUES (?, ?, ?, ?, ?, ?)",
        (req.job_id, req.student_id, resume_id, "APPLIED", now, req.tailored_file)
    )
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": "🎉 Application submitted successfully to the Admin Portal with your ATS Tailored Resume!",
        "tailored_file": req.tailored_file
    }

@router.post("/api/jobs/apply")
def apply_for_job(req: JobApplyRequest):
    from app.tools.attendance_tool import apply_for_job_tool
    res_str = apply_for_job_tool.invoke({"student_id": req.student_id, "job_id": req.job_id})
    m = re.search(r"(tailored_[\w.-]+\.html)", res_str)
    tailored_file = m.group(1) if m else None
    
    if "already submitted" in res_str.lower() or "already applied" in res_str.lower():
        return {"status": "already_applied", "message": "You have already submitted an application for this job.", "tailored_file": tailored_file}
    
    return {"status": "success", "message": "Application submitted successfully with ATS Tailored Resume!", "tailored_file": tailored_file}

@router.get("/api/jobs/my-applications/{student_id}")
def get_my_applications(student_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ja.id as application_id, ja.status, ja.applied_at, ja.tailored_resume_path,
               j.id as job_id, j.title as job_title, j.title, j.company, j.branch as job_branch, j.description
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.student_id = ?
        ORDER BY ja.applied_at DESC
    """, (student_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Compute shortlisted notifications summary
    shortlisted_count = sum(1 for r in rows if r.get("status") == "SHORTLISTED")
    return {
        "student_id": student_id,
        "applications": rows,
        "count": len(rows),
        "shortlisted_count": shortlisted_count,
        "has_shortlisted_updates": shortlisted_count > 0
    }

@router.get("/api/jobs/{job_id}/applicants")
def get_job_applicants(job_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ja.id as application_id, ja.status, ja.applied_at, ja.tailored_resume_path,
               u.id as student_id, u.id as roll_no, u.name as student_name, u.name, u.email as student_email, u.branch as student_branch, u.section as student_section,
               r.parsed_json, r.domain, r.resume_score
        FROM job_applications ja
        JOIN users u ON ja.student_id = u.id
        LEFT JOIN resumes r ON ja.resume_id = r.id
        WHERE ja.job_id = ?
        ORDER BY ja.applied_at DESC
    """, (job_id,))
    rows = []
    for r in cursor.fetchall():
        d = dict(r)
        if d.get("parsed_json"):
            try:
                d["parsed_json"] = json.loads(d["parsed_json"])
            except Exception:
                pass
        rows.append(d)
    conn.close()
    return {"job_id": job_id, "applicants": rows, "count": len(rows)}

@router.get("/api/jobs/applications")
@router.get("/api/admin/applications")
def get_admin_applications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ja.id as application_id, ja.id, ja.status, ja.applied_at, ja.tailored_resume_path,
               j.id as job_id, j.title as job_title, j.title, j.company, j.branch as job_branch,
               u.id as student_id, u.id as roll_no, u.name as student_name, u.name, u.email as student_email, u.branch as student_branch,
               r.parsed_json, r.domain, r.resume_score
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN users u ON ja.student_id = u.id
        LEFT JOIN resumes r ON ja.resume_id = r.id
        ORDER BY ja.applied_at DESC
    """)
    rows = []
    for r in cursor.fetchall():
        d = dict(r)
        if d.get("parsed_json"):
            try:
                d["parsed_json"] = json.loads(d["parsed_json"])
            except Exception:
                pass
        rows.append(d)
    conn.close()
    return {"applications": rows}

@router.post("/api/jobs/{job_id}/fit-check")
def fit_check(job_id: int, student_id: str):
    """
    Deterministic job-fit analysis for a student.
    Returns fit_score, matched_skills, missing_skills, verdict, and formatted analysis.
    """
    import json
    from app.database import get_db_connection, get_student_record, get_parsed_resume
    from app.tools.placement_tool import extract_required_skills, compute_fit, generate_fit_verdict
    from app.memory.store import set_fact

    conn = get_db_connection()
    job_row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    conn.close()
    if not job_row:
        return {"status": "error", "message": f"Job ID {job_id} not found."}
    job = dict(job_row)

    student = get_student_record(student_id)
    if not student:
        return {"status": "error", "message": f"Student record not found for {student_id}."}

    resume = get_parsed_resume(student_id)
    if not resume:
        return {"status": "error", "message": "You don't have a parsed resume on file yet. Please upload and parse your resume first."}

    student_skills = resume.get("skills", [])
    resume_score = resume.get("resume_score", 0)
    required = extract_required_skills(job)
    fit = compute_fit(student_skills, required, student.get("branch", ""), job.get("branch"), resume_score)
    verdict = generate_fit_verdict(job, fit)

    set_fact(student_id, f"last_fit_check_job_{job_id}", json.dumps(fit))

    return {
        "status": "success",
        "job_id": job_id,
        "student_id": student_id,
        "fit_score": fit["fit_score"],
        "matched_skills": fit["matched_skills"],
        "missing_skills": fit["missing_skills"],
        "skill_coverage_pct": fit["skill_coverage_pct"],
        "branch_match": fit["branch_match"],
        "verdict": verdict,
        "analysis": f"{verdict}\n\n[fit_score={fit['fit_score']}/100 | missing_skills={fit['missing_skills']}]"
    }


@router.patch("/api/jobs/applications/{app_id}/status")
def update_application_status(app_id: int, body: dict):
    status = body.get("status")
    if status not in ("APPLIED", "SHORTLISTED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Invalid status value.")
    conn = get_db_connection()
    conn.execute("UPDATE job_applications SET status=? WHERE id=?", (status, app_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Application status updated to {status}."}
