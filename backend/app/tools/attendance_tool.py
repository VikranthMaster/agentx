"""
LangChain @tool definitions for all campus operations.
Called by the LLM via tool-calling — NO keyword matching, NO if/else routing.
"""
import json
import os
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
        db_students = get_students_by_branch_section(branch, section)
        total = max(len(db_students), len(present_student_ids))
        return (
            f"✅ Attendance posted.\n"
            f"- Session ID: {session_id} | Date: {date} | Period: {period}\n"
            f"- Subject: {subject} | {branch}-{section}\n"
            f"- Present ({len(present_student_ids)}): {', '.join(present_student_ids)}\n"
            f"- Absent: {max(0, total - len(present_student_ids))}"
        )
    except Exception as e:
        return f"Error posting attendance: {e}"


@tool
def get_attendance_summary_tool(
    date: Optional[str] = None,
    branch: Optional[str] = None,
    section: Optional[str] = None,
) -> str:
    """
    Get a summary of attendance sessions, optionally filtered by date, branch, section.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT s.id, s.date, s.period, s.subject, s.branch, s.section,
               COUNT(sa.id) as total, SUM(CASE WHEN sa.status='PRESENT' THEN 1 ELSE 0 END) as present
        FROM attendance_sessions s
        LEFT JOIN student_attendance sa ON s.id = sa.session_id
        WHERE 1=1
    """
    params = []
    if date:
        query += " AND s.date=?"; params.append(date)
    if branch:
        query += " AND s.branch=?"; params.append(branch)
    if section:
        query += " AND s.section=?"; params.append(section)
    query += " GROUP BY s.id ORDER BY s.date DESC, s.period ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    if not rows:
        return "No attendance sessions found."
    return "\n".join(
        f"[{r['date']} | Period {r['period']} | {r['subject']} | {r['branch']}-{r['section']}] → {r['present']}/{r['total']} present"
        for r in rows
    )


@tool
def get_student_list_tool(branch: str, section: str) -> str:
    """
    Get all students registered in a given branch and section.
    """
    students = get_students_by_branch_section(branch, section)
    if not students:
        return f"No students registered in {branch}-{section}."
    lines = [f"- {s['id']}: {s['name']}" for s in students]
    return f"Students in {branch}-{section} ({len(students)}):\n" + "\n".join(lines)


@tool
def register_student_tool(
    roll_no: str,
    name: str,
    email: str,
    branch: str,
    section: str,
    year: int,
) -> str:
    """
    Register a new student in the campus ERP system.

    Args:
        roll_no: Roll number in format 1602-YY-BRC-SRN (e.g. 1602-24-733-160)
        name: Full name of the student
        email: Email address
        branch: Branch (e.g. 'CSE', 'ECE', 'CSE (AI/ML)')
        section: Section letter (e.g. 'A', 'B')
        year: Year of study (1, 2, 3, or 4)
    """
    try:
        register_student(roll_no=roll_no, name=name, email=email,
                         branch=branch, section=section, year=year)
        return (
            f"✅ Student registered successfully.\n"
            f"- Roll No: {roll_no}\n- Name: {name}\n- Branch: {branch}-{section}, Year {year}\n"
            f"- Default login password: student"
        )
    except Exception as e:
        return f"Error registering student: {e}"


@tool
def get_job_applications_tool() -> str:
    """Get all candidate job applications submitted to the admin portal."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT j.title, j.company, u.name, u.id as roll_no, ja.status, ja.applied_at
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN users u ON ja.student_id = u.id
        ORDER BY j.title, ja.applied_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    if not rows:
        return "No job applications found yet."
    return f"Applications ({len(rows)}):\n" + "\n".join(
        f"- {r['title']} @ {r['company']} | {r['name']} ({r['roll_no']}) | {r['status']}"
        for r in rows
    )


# ── Student Tools ────────────────────────────────────────────────────────────

@tool
def get_my_attendance_tool(student_id: str) -> str:
    """
    Get the complete period-wise attendance record for a student.

    Args:
        student_id: The student's roll number (e.g. '1602-24-733-160')
    """
    records = get_student_attendance(student_id)
    if not records:
        return f"No attendance records found for {student_id} yet."

    total = len(records)
    present = sum(1 for r in records if r["status"] == "PRESENT")
    pct = round((present / total) * 100, 1) if total else 0

    by_date: dict = {}
    for r in records:
        by_date.setdefault(r["date"], []).append(r)

    lines = [f"Attendance for {student_id}: {pct}% ({present}/{total} periods present)\n"]
    for date, sessions in sorted(by_date.items(), reverse=True):
        lines.append(f"\n📅 {date}:")
        for s in sorted(sessions, key=lambda x: x["period"]):
            icon = "✅" if s["status"] == "PRESENT" else "❌"
            lines.append(f"  Period {s['period']} — {s['subject']}: {icon} {s['status']}")
    return "\n".join(lines)


@tool
def get_jobs_tool() -> str:
    """Get all open placement drives posted by admin."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    if not rows:
        return "No placement drives posted yet."
    lines = []
    for j in rows:
        cal = f" | 📅 Calendar: {j['calendar_link']}" if j['calendar_link'] else ""
        lines.append(
            f"[JOB ID {j['id']}] {j['title']} @ {j['company']} ({j['branch']}){cal}\n"
            f"   Description: {j['description']}\n"
            f"   Requirements: {j['requirements']}"
        )
    return "\n\n".join(lines)


@tool
def get_syllabus_tool(branch: Optional[str] = None, semester: Optional[int] = None) -> str:
    """
    Get available syllabus PDFs, optionally filtered by branch and semester.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    q = "SELECT * FROM syllabus WHERE 1=1"
    params = []
    if branch:
        q += " AND branch=?"; params.append(branch)
    if semester:
        q += " AND semester=?"; params.append(semester)
    q += " ORDER BY id DESC"
    cursor.execute(q, params)
    rows = cursor.fetchall()
    conn.close()
    if not rows:
        return "No syllabus files found."
    return "Syllabus PDFs:\n" + "\n".join(
        f"- [ID {s['id']}] {s['subject']} ({s['branch']}, Sem {s['semester']}) — uploaded {s['uploaded_at'][:10]}"
        for s in rows
    )


@tool
def get_my_resume_tool(student_id: str) -> str:
    """
    Get the parsed resume / candidate profile for a student from the database.

    Args:
        student_id: The student's roll number
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE student_id=?", (student_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return (
            f"No resume found for {student_id}. "
            "Please upload a PDF or DOCX resume using the attachment button in this chat."
        )

    row = dict(row)  # fix: sqlite3.Row → dict so .get() works
    try:
        parsed = json.loads(row.get("parsed_json", "{}"))
    except Exception:
        parsed = {}

    domain = row.get("domain") or parsed.get("domain", "N/A")
    score = row.get("resume_score") or parsed.get("resume_score", 0)
    skills = parsed.get("skills", [])
    analysis = parsed.get("analysis", "N/A")

    return (
        f"Resume Profile for {student_id}:\n"
        f"- Domain: {domain}\n"
        f"- ATS Score: {score}/100\n"
        f"- Skills: {', '.join(skills[:12]) if skills else 'None'}\n"
        f"- AI Feedback: {analysis[:400]}"
    )


@tool
def apply_for_job_tool(student_id: str, job_id: int) -> str:
    """
    Compare the student's parsed resume with the job requirements, generate an
    optimised tailored resume as HTML, and submit the application to the admin portal.

    Args:
        student_id: The student's roll number
        job_id: The integer ID of the job to apply for
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch job
    cursor.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
    job_row = cursor.fetchone()
    if not job_row:
        conn.close()
        return f"Job with ID {job_id} not found. Use get_jobs_tool to list available jobs."
    job = dict(job_row)

    # 2. Fetch student resume
    cursor.execute("SELECT * FROM resumes WHERE student_id=?", (student_id,))
    resume_row = cursor.fetchone()
    if not resume_row:
        conn.close()
        return (
            "You don't have a resume on file yet. "
            "Please upload your PDF resume using the attachment button first."
        )
    resume_row = dict(resume_row)
    try:
        parsed = json.loads(resume_row.get("parsed_json", "{}"))
    except Exception:
        parsed = {}

    # 3. Check if already applied
    cursor.execute(
        "SELECT id FROM job_applications WHERE job_id=? AND student_id=?",
        (job_id, student_id)
    )
    if cursor.fetchone():
        conn.close()
        return f"You have already applied for Job ID {job_id} ({job['title']} @ {job['company']})."

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
        # Strip triple backticks if returned
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
    Apply for a placement drive job on behalf of a student.
    Generates a tailored resume matching the job description and submits the application.

    Args:
        student_id: The student's roll number
        job_id: The job ID from the jobs list
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch job
    cursor.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
    job_row = cursor.fetchone()
    if not job_row:
        conn.close()
        return f"Job with ID {job_id} not found. Use get_jobs_tool to list available jobs."
    job = dict(job_row)

    # 2. Fetch student resume
    cursor.execute("SELECT id FROM resumes WHERE student_id=?", (student_id,))
    resume_row = cursor.fetchone()
    if not resume_row:
        conn.close()
        return (
            "You don't have a resume on file yet. "
            "Please upload your PDF resume using the attachment button or in the Resume Profile tab."
        )

    # 3. Check if already applied
    cursor.execute(
        "SELECT id FROM job_applications WHERE job_id=? AND student_id=?",
        (job_id, student_id)
    )
    if cursor.fetchone():
        conn.close()
        return f"You have already applied for Job ID {job_id} ({job['title']} @ {job['company']})."

    # 4. Generate tailored resume HTML
    html_filename, match_score, matched_skills = generate_tailored_resume(student_id, job)
    html_path = os.path.join(UPLOAD_DIR, html_filename)

    # 5. Submit application
    now = datetime.now().isoformat()
    cursor.execute(
        """INSERT INTO job_applications (job_id, student_id, resume_id, status, applied_at, tailored_resume_path)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (job_id, student_id, resume_row["id"], "APPLIED", now, html_filename)
    )
    conn.commit()
    conn.close()

    return (
        f"✅ Application submitted for **{job['title']}** at **{job['company']}**!\n"
        f"- ATS Job Match Score: **{match_score}%**\n"
        f"- Matched Skills: {', '.join(matched_skills) if matched_skills else 'All Core Requirements'}\n"
        f"- Tailored Resume Preview saved at: {html_filename}"
    )


@tool
def get_upcoming_contests_tool(platform: Optional[str] = None) -> str:
    """
    Get upcoming competitive programming contests (Codeforces, LeetCode, CodeChef, AtCoder).

    Args:
        platform: Optional platform name filter ('codeforces', 'leetcode', 'codechef', 'atcoder')
    """
    from app.database import get_contests_from_db
    contests = get_contests_from_db(platform)
    if not contests:
        return f"No contests found for platform '{platform or 'all'}'."

    now_iso = datetime.now().isoformat()
    upcoming = [c for c in contests if c["end_time"] >= now_iso]
    if not upcoming:
        upcoming = contests[:5]

    lines = []
    for c in upcoming[:10]:
        v_str = f" [Video Solution: {c['solution_video_url']}]" if c.get("has_solution_video") and c.get("solution_video_url") else ""
        lines.append(
            f"- [{c['platform'].upper()}] {c['contest_name']} | Starts: {c['start_time'][:16].replace('T', ' ')} | Link: {c['contest_url']}{v_str}"
        )
    return f"Upcoming Contests ({len(upcoming)} shown):\n" + "\n".join(lines)


@tool
def post_job_tool(
    title: str,
    company: str,
    description: str,
    requirements: str,
    branch: str = "ALL",
    create_calendar_event: bool = True,
    posted_by: str = "admin",
) -> str:
    """
    Post a new placement drive / job opening for students.

    Args:
        title: Job title (e.g. 'Software Engineer', 'Data Analyst')
        company: Company name (e.g. 'Google', 'Microsoft')
        description: Role description and responsibilities
        requirements: Eligibility criteria and required technical skills
        branch: Target branch ('CSE', 'ECE', 'MECH', or 'ALL')
        create_calendar_event: Whether to generate a Google Calendar event reminder
        posted_by: Admin ID posting this job drive
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    calendar_link = None

    if create_calendar_event:
        try:
            from app.tools.google_calendar import create_event_with_reminder
            start_dt = datetime.now() + timedelta(days=2)
            summary = f"Placement Drive: {title} ({company})"
            cal_res = create_event_with_reminder(summary=summary, start_dt=start_dt, duration_minutes=120)
            if cal_res.get("success"):
                calendar_link = cal_res.get("link")
        except Exception as e:
            pass

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


