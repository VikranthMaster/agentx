import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "campus.db")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL DEFAULT 'student',
        role TEXT NOT NULL,
        branch TEXT,
        section TEXT,
        year INTEGER
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 6),
        subject TEXT NOT NULL,
        branch TEXT NOT NULL,
        section TEXT NOT NULL,
        posted_by TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        student_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS syllabus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        branch TEXT NOT NULL,
        semester INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT NOT NULL,
        branch TEXT,
        posted_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        calendar_link TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        original_file_path TEXT NOT NULL,
        parsed_json TEXT NOT NULL,
        domain TEXT,
        resume_score INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES users(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS job_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        student_id TEXT NOT NULL,
        resume_id INTEGER,
        status TEXT NOT NULL DEFAULT 'APPLIED',
        applied_at TEXT NOT NULL,
        tailored_resume_path TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (resume_id) REFERENCES resumes(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE,
        platform TEXT NOT NULL,
        contest_name TEXT NOT NULL,
        contest_url TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration INTEGER,
        has_solution_video INTEGER DEFAULT 0,
        solution_video_url TEXT,
        source TEXT DEFAULT 'tle',
        contest_type TEXT,
        division_types TEXT,
        updated_at TEXT
    );
    """)

    # ── Newsletter ─────────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        student_id TEXT,
        subscribed_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS newsletter_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sent_date TEXT NOT NULL,
        recipients_count INTEGER,
        created_at TEXT NOT NULL
    );
    """)

    # ── Long-Term Memory ───────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS long_term_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        source_session_id TEXT,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ltm_student ON long_term_memory(student_id, category)")

    # ── Job Skill Cache (Placement Intelligence) ───────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS job_skill_cache (
        job_id INTEGER PRIMARY KEY,
        required_skills TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # ── Saved Roadmaps ─────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_roadmaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # ── Hackathons ─────────────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hackathons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        tech_focus TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        registration_deadline TEXT NOT NULL,
        team_size_max INTEGER DEFAULT 4,
        posted_by TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hackathon_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hackathon_id INTEGER NOT NULL,
        student_id TEXT NOT NULL,
        team_name TEXT,
        idea_summary TEXT,
        status TEXT NOT NULL DEFAULT 'REGISTERED',
        applied_at TEXT NOT NULL,
        FOREIGN KEY (hackathon_id) REFERENCES hackathons(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()


def seed_initial_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        # Only admin — no fake student names seeded automatically.
        # Students are registered via Admin portal with real roll numbers.
        users = [
            ("admin", "Admin", "admin@campus.edu", "admin123", "admin", None, None, 0),
        ]
        cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)", users)
        conn.commit()

def register_student(roll_no: str, name: str, email: str, branch: str, section: str, year: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (id, name, email, password, role, branch, section, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            email=excluded.email,
            branch=excluded.branch,
            section=excluded.section,
            year=excluded.year
    """, (roll_no, name, email, "student", "student", branch, section, year))
    conn.commit()
    conn.close()

def post_attendance_record(date: str, period: int, subject: str, branch: str, section: str,
                            posted_by: str, present_student_ids: list[str]) -> int:
    """
    Posts attendance for a session. Only records students explicitly listed as present_student_ids
    as PRESENT; everyone else in the branch+section is marked ABSENT.
    If no branch/section match, only the explicitly listed IDs are stored.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    # Upsert session
    cursor.execute("""
        SELECT id FROM attendance_sessions
        WHERE date=? AND period=? AND branch=? AND section=?
    """, (date, period, branch, section))
    row = cursor.fetchone()

    if row:
        session_id = row["id"]
        cursor.execute(
            "UPDATE attendance_sessions SET subject=?, posted_by=?, created_at=? WHERE id=?",
            (subject, posted_by, now, session_id)
        )
        cursor.execute("DELETE FROM student_attendance WHERE session_id=?", (session_id,))
    else:
        cursor.execute("""
            INSERT INTO attendance_sessions (date, period, subject, branch, section, posted_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (date, period, subject, branch, section, posted_by, now))
        session_id = cursor.lastrowid

    # Resolve all students in this branch+section from DB
    cursor.execute(
        "SELECT id FROM users WHERE role='student' AND branch=? AND section=?",
        (branch, section)
    )
    db_students = {r["id"] for r in cursor.fetchall()}

    # Union: anyone explicitly listed + everyone in branch+section
    all_relevant = db_students | set(present_student_ids)

    present_set = set(present_student_ids)
    for sid in all_relevant:
        status = "PRESENT" if sid in present_set else "ABSENT"
        cursor.execute(
            "INSERT INTO student_attendance (session_id, student_id, status) VALUES (?, ?, ?)",
            (session_id, sid, status)
        )

    conn.commit()
    conn.close()
    return session_id

def get_student_attendance(student_id: str) -> list[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.date, s.period, s.subject, s.branch, s.section, sa.status
        FROM student_attendance sa
        JOIN attendance_sessions s ON sa.session_id = s.id
        WHERE sa.student_id = ?
        ORDER BY s.date DESC, s.period ASC
    """, (student_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_students_by_branch_section(branch: str, section: str) -> list[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name FROM users WHERE role='student' AND branch=? AND section=?",
        (branch, section)
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def save_contests(contests: list[dict]):
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    for c in contests:
        div_str = json.dumps(c.get("division_types") or [])
        cursor.execute("""
            INSERT INTO contests (
                external_id, platform, contest_name, contest_url,
                start_time, end_time, duration, has_solution_video,
                solution_video_url, source, contest_type, division_types, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(external_id) DO UPDATE SET
                platform=excluded.platform,
                contest_name=excluded.contest_name,
                contest_url=excluded.contest_url,
                start_time=excluded.start_time,
                end_time=excluded.end_time,
                duration=excluded.duration,
                has_solution_video=excluded.has_solution_video,
                solution_video_url=excluded.solution_video_url,
                source=excluded.source,
                contest_type=excluded.contest_type,
                division_types=excluded.division_types,
                updated_at=excluded.updated_at
        """, (
            c.get("external_id"), c.get("platform"), c.get("contest_name"), c.get("contest_url"),
            c.get("start_time"), c.get("end_time"), c.get("duration"), 1 if c.get("has_solution_video") else 0,
            c.get("solution_video_url"), c.get("source", "tle"), c.get("contest_type"), div_str, now
        ))
    conn.commit()
    conn.close()

def get_contests_from_db(platform: str = None) -> list[dict]:
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    if platform and platform.lower() != 'all':
        cursor.execute("SELECT * FROM contests WHERE LOWER(platform)=LOWER(?) ORDER BY start_time ASC", (platform,))
    else:
        cursor.execute("SELECT * FROM contests ORDER BY start_time ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    for r in rows:
        try:
            r["division_types"] = json.loads(r["division_types"]) if r.get("division_types") else []
        except Exception:
            r["division_types"] = []
        r["has_solution_video"] = bool(r.get("has_solution_video"))
    return rows


# ── Newsletter helpers ─────────────────────────────────────────────────────────

def add_newsletter_subscriber(email: str, student_id: str | None = None):
    conn = get_db_connection()
    try:
        conn.execute(
            """INSERT INTO newsletter_subscribers (email, student_id, subscribed_at, active)
               VALUES (?, ?, ?, 1)
               ON CONFLICT(email) DO UPDATE SET active=1, student_id=excluded.student_id""",
            (email, student_id, datetime.now().isoformat())
        )
        conn.commit()
    except Exception:
        conn.execute(
            "UPDATE newsletter_subscribers SET active=1, student_id=? WHERE email=?",
            (student_id, email)
        )
        if conn.total_changes == 0:
            conn.execute(
                "INSERT INTO newsletter_subscribers (email, student_id, subscribed_at, active) VALUES (?, ?, ?, 1)",
                (email, student_id, datetime.now().isoformat())
            )
        conn.commit()
    finally:
        conn.close()


def remove_newsletter_subscriber(email: str):
    conn = get_db_connection()
    conn.execute("UPDATE newsletter_subscribers SET active=0 WHERE email=?", (email,))
    conn.commit()
    conn.close()


def get_active_subscribers() -> list[str]:
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT email FROM newsletter_subscribers WHERE active=1"
    ).fetchall()
    conn.close()
    return [r["email"] for r in rows]


def already_sent_today() -> bool:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT 1 FROM newsletter_log WHERE sent_date = date('now') LIMIT 1"
    ).fetchone()
    conn.close()
    return row is not None


def log_newsletter_sent(count: int):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO newsletter_log (sent_date, recipients_count, created_at) VALUES (date('now'), ?, ?)",
        (count, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


# ── Job skill cache helpers ────────────────────────────────────────────────────

def get_cached_job_skills(job_id: int) -> list[str] | None:
    import json
    conn = get_db_connection()
    row = conn.execute(
        "SELECT required_skills FROM job_skill_cache WHERE job_id=?", (job_id,)
    ).fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["required_skills"])
        except Exception:
            return None
    return None


def cache_job_skills(job_id: int, skills: list[str]):
    import json
    conn = get_db_connection()
    conn.execute(
        """INSERT INTO job_skill_cache (job_id, required_skills, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(job_id) DO UPDATE SET required_skills=excluded.required_skills, updated_at=excluded.updated_at""",
        (job_id, json.dumps(skills), datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


# ── Roadmap helpers ────────────────────────────────────────────────────────────

def save_roadmap(student_id: str, topic: str, content: str):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO saved_roadmaps (student_id, topic, content, created_at) VALUES (?, ?, ?, ?)",
        (student_id, topic, content, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()


def get_student_record(student_id: str) -> dict | None:
    """Fetch real student row from users table (not mock data)."""
    conn = get_db_connection()
    row = conn.execute(
        "SELECT id, name, email, branch, section, year FROM users WHERE id=?", (student_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_parsed_resume(student_id: str) -> dict | None:
    import json
    conn = get_db_connection()
    row = conn.execute(
        "SELECT parsed_json, resume_score, domain FROM resumes WHERE student_id=?", (student_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    r = dict(row)
    try:
        parsed = json.loads(r.get("parsed_json") or "{}")
    except Exception:
        parsed = {}
    parsed["resume_score"] = r.get("resume_score", 0)
    parsed["domain"] = r.get("domain", "")
    return parsed


# ── Hackathon helpers ──────────────────────────────────────────────────────────

def get_hackathon(hackathon_id: int) -> dict | None:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM hackathons WHERE id=?", (hackathon_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

