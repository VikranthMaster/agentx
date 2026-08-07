"""
LangChain @tool definitions for all campus operations.
Called by the LLM via tool-calling — NO keyword matching, NO if/else routing.
"""
import json
import os
import re
from typing import Optional
from datetime import datetime, timedelta
from langchain_core.tools import tool

from app.database import (
    post_attendance_record,
    get_student_attendance,
    get_students_by_branch_section,
    get_db_connection,
    register_student,
)
from app.memory.store import set_fact, get_facts

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "..", "data", "resumes"
)


# ── Attendance Tools ─────────────────────────────────────────────────────────

@tool
def post_attendance_tool(
    date: str,
    period: int,
    subject: str,
    branch: str,
    section: str,
    present_student_ids: list[str],
    posted_by: str = "admin",
) -> str:
    """
    Post 6-period attendance to the database.

    Args:
        date: Date in YYYY-MM-DD format
        period: Period number 1-6
        subject: Exact subject name (e.g. 'System Design', 'DBMS')
        branch: Branch (e.g. 'CSE', 'ECE')
        section: Section letter (e.g. 'A', 'B')
        present_student_ids: List of roll numbers that were PRESENT
        posted_by: Admin ID posting this record
    """
    try:
        session_id = post_attendance_record(
            date=date, period=period, subject=subject,
            branch=branch, section=section,
            posted_by=posted_by, present_student_ids=present_student_ids,
        )
        students = get_students_by_branch_section(branch, section)
        total = len(students)
        present = len(present_student_ids)
        return (
            f"✅ Attendance posted successfully (Session #{session_id}).\n"
            f"- Subject: {subject} (Period {period})\n"
            f"- Date: {date}\n"
            f"- Branch/Sec: {branch}-{section}\n"
            f"- Present: {present}/{total} students."
        )
    except Exception as e:
        return f"Error posting attendance: {e}"


@tool
def get_attendance_summary_tool(
    branch: Optional[str] = None,
    section: Optional[str] = None,
    date: Optional[str] = None,
) -> str:
    """
    Get an aggregate summary of attendance records filtered by branch, section, or date.

    Args:
        branch: Branch code like 'CSE' or 'ECE'
        section: Section letter like 'A' or 'B'
        date: Specific date in YYYY-MM-DD format
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT s.id, s.date, s.period, s.subject, s.branch, s.section,
               COUNT(a.id) as total_students,
               SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_count
        FROM attendance_sessions s
        LEFT JOIN student_attendance a ON s.id = a.session_id
        WHERE 1=1
    """
    params = []
    if branch:
        query += " AND s.branch = ?"
        params.append(branch)
    if section:
        query += " AND s.section = ?"
        params.append(section)
    if date:
        query += " AND s.date = ?"
        params.append(date)

    query += " GROUP BY s.id ORDER BY s.date DESC, s.period ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return "No attendance records found matching the given filters."

    lines = ["Attendance Summary:"]
    for r in rows:
        present = r["present_count"] or 0
        total = r["total_students"] or 0
        pct = round((present / total) * 100, 1) if total > 0 else 0
        lines.append(
            f"- Date: {r['date']} | Period {r['period']} | {r['subject']} ({r['branch']}-{r['section']}): "
            f"{present}/{total} Present ({pct}%)"
        )
    return "\n".join(lines)


@tool
def get_my_attendance_tool(student_id: str) -> str:
    """
    Get detailed attendance history and overall percentage for a student.

    Args:
        student_id: The student's roll number
    """
    records = get_student_attendance(student_id)
    if not records:
        return f"No attendance records found for student {student_id}."

    total = len(records)
    present = sum(1 for r in records if r["status"] == "PRESENT")
    pct = round((present / total) * 100, 1) if total > 0 else 0

    lines = [
        f"Attendance Profile for Roll Number: {student_id}",
        f"Overall Attendance: {pct}% ({present}/{total} Periods Present)\n",
        "Recent Period Breakdown:",
    ]
    for r in records[:10]:
        status_icon = "✅ PRESENT" if r["status"] == "PRESENT" else "❌ ABSENT"
        lines.append(
            f"- Date: {r['date']} | Period {r['period']} | {r['subject']} — {status_icon}"
        )
    return "\n".join(lines)


@tool
def get_student_list_tool(branch: str = "CSE", section: str = "A") -> str:
    """
    Get all registered students for a branch and section.

    Args:
        branch: Branch code (e.g. 'CSE', 'ECE')
        section: Section letter (e.g. 'A', 'B')
    """
    students = get_students_by_branch_section(branch, section)
    if not students:
        return f"No registered students found for {branch}-{section}."

    lines = [f"Registered Students for {branch}-{section} ({len(students)} total):"]
    for s in students:
        lines.append(f"- Roll: {s['id']} | Name: {s['name']} | Email: {s['email']}")
    return "\n".join(lines)


# ── Student Registration Tool ───────────────────────────────────────────────

@tool
def register_student_tool(
    roll_no: str,
    name: str,
    email: str,
    branch: str,
    section: str = "A",
    year: int = 1,
) -> str:
    """
    Register a new student into the campus database.

    Args:
        roll_no: Roll number in format 1602-24-733-160
        name: Full name of the student
        email: Email address
        branch: Branch code (e.g. 'CSE', 'ECE')
        section: Section letter (e.g. 'A', 'B')
        year: Academic year (1-4)
    """
    try:
        register_student(
            roll_no=roll_no,
            name=name,
            email=email,
            branch=branch,
            section=section,
            year=year,
        )
        return f"✅ Student {name} ({roll_no}) registered successfully in branch {branch}-{section} (Year {year})."
    except Exception as e:
        return f"Error registering student: {e}"


# ── Placement & Job Tools ───────────────────────────────────────────────────

@tool
def get_jobs_tool(branch: Optional[str] = None) -> str:
    """
    List all active placement drive jobs.

    Args:
        branch: Filter by eligible branch (optional)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM jobs"
    params = []
    if branch:
        query += " WHERE branch = ?"
        params.append(branch)
    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return "No active placement drive jobs found."

    lines = ["Active Placement Drives:"]
    for r in rows:
        cal_str = f" | GCal Event: {r['calendar_link']}" if r.get("calendar_link") else ""
        lines.append(
            f"- Job ID #{r['id']}: {r['title']} @ {r['company']} (Branch: {r['branch']})\n"
            f"  Requirements: {r['requirements']}{cal_str}"
        )
    return "\n".join(lines)


@tool
def get_job_applications_tool(job_id: Optional[int] = None) -> str:
    """
    View candidate job applications submitted for placement drives.

    Args:
        job_id: Filter by job ID (optional)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT ja.id, ja.status, ja.applied_at, ja.tailored_resume_path,
               j.title as job_title, j.company,
               u.id as student_id, u.name as student_name,
               r.resume_score, r.domain
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN users u ON ja.student_id = u.id
        LEFT JOIN resumes r ON ja.resume_id = r.id
        WHERE 1=1
    """
    params = []
    if job_id:
        query += " AND ja.job_id = ?"
        params.append(job_id)
    query += " ORDER BY ja.applied_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return "No candidate job applications found."

    lines = ["Candidate Job Applications:"]
    for r in rows:
        lines.append(
            f"- App #{r['id']}: {r['student_name']} ({r['student_id']}) -> {r['job_title']} @ {r['company']}\n"
            f"  Status: {r['status']} | ATS Score: {r['resume_score'] or 'N/A'}/100 | Domain: {r['domain'] or 'N/A'}"
        )
    return "\n".join(lines)


@tool
def post_job_tool(
    title: str,
    company: str,
    description: str,
    requirements: str,
    branch: str = "CSE",
    posted_by: str = "admin",
) -> str:
    """
    Post a new placement drive job and sync a Google Calendar event.

    Args:
        title: Job role title
        company: Company name
        description: Job description
        requirements: Requirements & tech stack
        branch: Eligible branch
        posted_by: Admin ID posting this job
    """
    now = datetime.now().isoformat()
    calendar_link = None

    try:
        from app.tools.google_calendar import create_event_with_reminder
        start_dt = datetime.now() + timedelta(days=2)
        summary = f"Placement Drive: {title} ({company})"
        cal_res = create_event_with_reminder(summary=summary, start_dt=start_dt, duration_minutes=120)
        if cal_res.get("success"):
            calendar_link = cal_res.get("link")
    except Exception:
        pass

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO jobs (title, company, description, requirements, branch, posted_by, created_at, calendar_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (title, company, description, requirements, branch, posted_by, now, calendar_link)
    )
    job_id = cursor.lastrowid
    conn.commit()
    conn.close()

    cal_note = f"\n- Google Calendar Link: {calendar_link}" if calendar_link else ""
    return (
        f"✅ Placement Drive Posted Successfully!\n"
        f"- Job ID: {job_id}\n"
        f"- Title: {title} @ {company}\n"
        f"- Eligible Branch: {branch}\n"
        f"- Requirements: {requirements}{cal_note}"
    )


def generate_tailored_resume(student_id: str, job: dict) -> tuple[str, int, list[str]]:
    """Generates an ATS Tailored HTML Resume matching job requirements using Groq LLM."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE student_id=?", (student_id,))
    res_row = cursor.fetchone()
    conn.close()

    parsed = {}
    if res_row:
        try:
            parsed = json.loads(dict(res_row).get("parsed_json", "{}"))
        except Exception:
            pass

    skills = parsed.get("skills", [])
    education = parsed.get("education", [])
    projects = parsed.get("projects", [])
    certs = parsed.get("certificates", [])
    bio = parsed.get("candidates", {}).get("bio", "")

    job_reqs = str(job.get("requirements", "")).lower()
    matched_skills = [s for s in skills if isinstance(s, str) and s.lower() in job_reqs]
    if not matched_skills and skills:
        matched_skills = skills[:4]

    match_score = 75
    if len(matched_skills) >= 2: match_score += 10
    if len(matched_skills) >= 4: match_score += 10
    match_score = min(match_score, 96)

    try:
        from app.config import GROQ_API_KEY
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=0)

        prompt = f"""You are an ATS Resume Optimization Specialist. Given a candidate's profile and a target job, generate a clean, modern, ATS-tailored resume as valid HTML.

JOB: {job['title']} at {job['company']}
REQUIREMENTS: {job['requirements']}
DESCRIPTION: {job['description']}

STUDENT PROFILE:
- Bio: {bio}
- Skills: {', '.join(skills)}
- Education: {json.dumps(education)}
- Projects: {json.dumps(projects)}
- Certificates: {json.dumps(certs)}

INSTRUCTIONS:
Generate a complete single-file HTML resume document with modern inline CSS styling (clean typography, subtle borders, professional headers). Highlight matched skills relevant to {job['title']}.
Start with <!DOCTYPE html> and end with </html>. Output ONLY valid HTML, no markdown code blocks."""

        response = llm.invoke([SystemMessage(content="Output valid HTML only."), HumanMessage(content=prompt)])
        tailored_html = response.content.strip()
        if tailored_html.startswith("```"):
            tailored_html = re.sub(r"^```\w*\n?", "", tailored_html)
            tailored_html = re.sub(r"\n?```$", "", tailored_html)
    except Exception as e:
        tailored_html = f"<!DOCTYPE html><html><body style='font-family:sans-serif;padding:30px;'><h2>ATS Tailored Resume for {job['title']}</h2><p>Student ID: {student_id}</p><p>Company: {job['company']}</p><h3>Key Skills</h3><p>{', '.join(skills)}</p></body></html>"

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    job_id = job.get("id", "1")
    html_filename = f"tailored_{student_id}_job{job_id}.html"
    html_path = os.path.join(UPLOAD_DIR, html_filename)
    with open(html_path, "w") as f:
        f.write(tailored_html)

    return html_filename, match_score, matched_skills


@tool
def apply_for_job_tool(student_id: str, job_id: int) -> str:
    """
    Step 1 of applying for a job. Generates an ATS-tailored resume preview matching
    the job requirements. Does NOT submit anything yet — the student must review
    the preview and explicitly confirm (e.g. "yes, submit it") before you call
    confirm_application_tool to actually apply.

    Args:
        student_id: The student's roll number
        job_id: The integer ID of the job to apply for
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
    job_row = cursor.fetchone()
    if not job_row:
        conn.close()
        return f"Job with ID {job_id} not found. Use get_jobs_tool to list available jobs."
    job = dict(job_row)

    cursor.execute("SELECT id FROM resumes WHERE student_id=?", (student_id,))
    if not cursor.fetchone():
        conn.close()
        return "You don't have a resume on file yet. Please upload a PDF or DOCX resume first."

    cursor.execute(
        "SELECT id FROM job_applications WHERE job_id=? AND student_id=?",
        (job_id, student_id)
    )
    if cursor.fetchone():
        conn.close()
        return f"You have already applied for Job ID {job_id} ({job['title']} @ {job['company']})."
    conn.close()

    html_filename, match_score, matched_skills = generate_tailored_resume(student_id, job)

    set_fact(student_id, "pending_application", json.dumps({
        "job_id": job_id,
        "tailored_filename": html_filename,
        "match_score": match_score,
        "matched_skills": matched_skills,
    }))

    return (
        f"I've generated an ATS-tailored resume for **{job['title']}** at **{job['company']}**.\n"
        f"- Match Score: {match_score}%\n"
        f"- Matched Skills: {', '.join(matched_skills) if matched_skills else 'Core Requirements'}\n"
        f"- Preview: /api/resume/tailored/{html_filename}\n\n"
        f"Reply to confirm and I'll submit it — or tell me if you'd rather apply elsewhere."
    )


@tool
def confirm_application_tool(student_id: str) -> str:
    """
    Step 2 of applying for a job. Actually submits the tailored resume generated by
    apply_for_job_tool. Only call this after the student explicitly confirms.

    Args:
        student_id: The student's roll number
    """
    pending_raw = get_facts(student_id).get("pending_application")
    if not pending_raw:
        return "There's no pending application to confirm. Ask me to apply for a job first."

    pending = json.loads(pending_raw)
    job_id, html_filename = pending["job_id"], pending["tailored_filename"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
    job_row = cursor.fetchone()
    if not job_row:
        conn.close()
        set_fact(student_id, "pending_application", "")
        return "That job is no longer available. Please choose another one."
    job = dict(job_row)

    cursor.execute(
        "SELECT id FROM job_applications WHERE job_id=? AND student_id=?",
        (job_id, student_id)
    )
    if cursor.fetchone():
        conn.close()
        set_fact(student_id, "pending_application", "")
        return f"You have already applied for {job['title']} at {job['company']}."

    cursor.execute("SELECT id FROM resumes WHERE student_id=?", (student_id,))
    resume_row = cursor.fetchone()
    resume_id = resume_row["id"] if resume_row else None

    now = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO job_applications (job_id, student_id, resume_id, status, applied_at, tailored_resume_path)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (job_id, student_id, resume_id, "APPLIED", now, html_filename)
    )
    conn.commit()
    conn.close()

    set_fact(student_id, "pending_application", "")

    return (
        f"✅ Application submitted for **{job['title']}** at **{job['company']}**!\n"
        f"- Tailored Resume: {html_filename}\n"
        f"- Status: Under Review — ask me anytime with 'show my applications'."
    )


@tool
def get_my_applications_tool(student_id: str) -> str:
    """
    Get the status of all job applications the student has submitted
    (Under Review, Accepted, or Rejected).

    Args:
        student_id: The student's roll number
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT j.title, j.company, ja.status, ja.applied_at
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.student_id = ?
        ORDER BY ja.applied_at DESC
    """, (student_id,))
    rows = cursor.fetchall()
    conn.close()
    if not rows:
        return "You haven't applied to any jobs yet."

    label = {"APPLIED": "Under Review", "SHORTLISTED": "Accepted", "REJECTED": "Rejected"}
    return "Your Applications:\n" + "\n".join(
        f"- {r['title']} @ {r['company']} — {label.get(r['status'], r['status'])} (applied {r['applied_at'][:10]})"
        for r in rows
    )


# ── Syllabus Tools ──────────────────────────────────────────────────────────

@tool
def get_syllabus_tool(branch: str = "CSE", semester: Optional[int] = None) -> str:
    """
    List syllabus files uploaded for a branch and optional semester.

    Args:
        branch: Branch code (e.g. 'CSE', 'ECE')
        semester: Semester number 1-8 (optional)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM syllabus WHERE branch = ?"
    params = [branch]
    if semester:
        query += " AND semester = ?"
        params.append(semester)
    query += " ORDER BY semester ASC, subject ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return f"No syllabus records found for branch {branch}."

    lines = [f"Syllabus Records for {branch}:"]
    for r in rows:
        lines.append(
            f"- Semester {r['semester']} | Subject: {r['subject']} (Uploaded: {r['uploaded_at'][:10]})"
        )
    return "\n".join(lines)


# ── Resume Tools ────────────────────────────────────────────────────────────

@tool
def get_my_resume_tool(student_id: str) -> str:
    """
    Get the parsed resume profile details for a student.

    Args:
        student_id: The student's roll number
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE student_id=?", (student_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return f"No resume on file for student {student_id}. Please upload a PDF or DOCX resume first."

    rdict = dict(row)
    parsed = {}
    try:
        parsed = json.loads(rdict.get("parsed_json", "{}"))
    except Exception:
        pass

    domain = rdict.get("domain") or parsed.get("domain", "N/A")
    score = rdict.get("resume_score") or parsed.get("resume_score", 0)
    skills = parsed.get("skills", [])
    analysis = parsed.get("analysis", "N/A")

    return (
        f"Resume Profile for Roll Number: {student_id}\n"
        f"- Domain: {domain}\n"
        f"- ATS Score: {score}/100\n"
        f"- Extracted Skills: {', '.join(skills[:12]) if skills else 'None'}\n"
        f"- Recruiter Feedback: {analysis[:300]}"
    )


@tool
def parse_resume_tool(student_id: str) -> str:
    """
    Parse the student's uploaded resume file using the Groq LLM Resume Parsing Agent
    and save the structured profile to the database.

    Args:
        student_id: The student's roll number
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT original_file_path FROM resumes WHERE student_id=?", (student_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row["original_file_path"]:
        return f"No uploaded resume file found for roll number {student_id}. Please upload a PDF or DOCX resume using the attachment button."

    file_path = row["original_file_path"]
    if not os.path.exists(file_path):
        return f"Resume file at {file_path} not found. Please upload a new PDF resume."

    from app.agents.resume_parser import parse_resume_with_llm
    parsed = parse_resume_with_llm(file_path, student_id)
    score = parsed.get("resume_score", 0)
    domain = parsed.get("domain", "N/A")
    skills = parsed.get("skills", [])

    return (
        f"✅ Resume parsed using Groq LLM Agent!\n"
        f"- Student ID: {student_id}\n"
        f"- Candidate Domain: {domain}\n"
        f"- ATS Score: {score}/100\n"
        f"- Extracted Skills: {', '.join(skills[:10]) if skills else 'None'}"
    )


# ── Contest Tracking Tool ───────────────────────────────────────────────────

@tool
def get_upcoming_contests_tool(platform: Optional[str] = None) -> str:
    """
    Get upcoming competitive programming contests (LeetCode, Codeforces, CodeChef, AtCoder).

    Args:
        platform: Filter by platform name e.g. 'leetcode' or 'codeforces' (optional)
    """
    try:
        from app.database import get_contests_from_db
        contests = get_contests_from_db()
        if not contests:
            return "No upcoming contests cached. Click Sync Contests on the Contest Tracker page."

        if platform:
            contests = [c for c in contests if c.get("platform", "").lower() == platform.lower()]

        if not contests:
            return f"No upcoming contests found for platform '{platform}'."

        lines = [f"Upcoming Contests ({len(contests)} total):"]
        for c in contests[:8]:
            dt_str = c.get("start_time", "")[:16].replace("T", " ")
            lines.append(f"- [{c.get('platform', 'CP').upper()}] {c.get('title')} — Starts: {dt_str}")

        return "\n".join(lines)
    except Exception as e:
        return f"Error fetching contests: {e}"
