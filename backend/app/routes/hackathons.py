from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.database import get_db_connection
from app.schemas.models import HackathonPostRequest, HackathonApplyRequest

router = APIRouter(tags=["Hackathons"])


@router.post("/api/hackathons")
def post_hackathon(req: HackathonPostRequest):
    """Admin: post a new hackathon."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO hackathons
           (title, description, tech_focus, start_date, end_date, registration_deadline,
            team_size_max, posted_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (req.title, req.description, req.tech_focus, req.start_date, req.end_date,
         req.registration_deadline, req.team_size_max, req.posted_by,
         datetime.now().isoformat())
    )
    hackathon_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"status": "success", "hackathon_id": hackathon_id,
            "message": f"Hackathon '{req.title}' posted successfully."}


@router.get("/api/hackathons")
def list_hackathons(include_past: bool = False):
    """List hackathons. Active only by default (registration_deadline >= today)."""
    conn = get_db_connection()
    if include_past:
        rows = conn.execute("SELECT * FROM hackathons ORDER BY registration_deadline DESC").fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM hackathons WHERE registration_deadline >= date('now') ORDER BY registration_deadline ASC"
        ).fetchall()
    conn.close()
    return {"hackathons": [dict(r) for r in rows]}


@router.get("/api/hackathons/{hackathon_id}")
def get_hackathon_detail(hackathon_id: int):
    """Get a single hackathon's details."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM hackathons WHERE id=?", (hackathon_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Hackathon not found.")
    return dict(row)


@router.post("/api/hackathons/{hackathon_id}/apply")
def apply_hackathon(hackathon_id: int, req: HackathonApplyRequest):
    """Student: register for a hackathon."""
    conn = get_db_connection()

    # Check hackathon exists and is open
    h = conn.execute("SELECT * FROM hackathons WHERE id=?", (hackathon_id,)).fetchone()
    if not h:
        conn.close()
        raise HTTPException(status_code=404, detail="Hackathon not found.")
    if h["registration_deadline"] < datetime.now().strftime("%Y-%m-%d"):
        conn.close()
        return {"status": "closed", "message": "Registration deadline has passed."}

    # Check duplicate
    existing = conn.execute(
        "SELECT id FROM hackathon_applications WHERE hackathon_id=? AND student_id=?",
        (hackathon_id, req.student_id)
    ).fetchone()
    if existing:
        conn.close()
        return {"status": "already_registered", "message": "You're already registered for this hackathon."}

    conn.execute(
        """INSERT INTO hackathon_applications
           (hackathon_id, student_id, team_name, idea_summary, status, applied_at)
           VALUES (?, ?, ?, ?, 'REGISTERED', ?)""",
        (hackathon_id, req.student_id, req.team_name, req.idea_summary, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    return {"status": "success",
            "message": f"Successfully registered for '{dict(h)['title']}'!",
            "hackathon_id": hackathon_id}


@router.get("/api/hackathons/{hackathon_id}/applicants")
def get_applicants(hackathon_id: int):
    """Admin: list all applicants for a hackathon."""
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT ha.id, ha.student_id, ha.team_name, ha.idea_summary, ha.status, ha.applied_at,
                  u.name as student_name, u.email as student_email, u.branch
           FROM hackathon_applications ha
           LEFT JOIN users u ON ha.student_id = u.id
           WHERE ha.hackathon_id = ?
           ORDER BY ha.applied_at DESC""",
        (hackathon_id,)
    ).fetchall()
    conn.close()
    return {"hackathon_id": hackathon_id, "applicants": [dict(r) for r in rows], "count": len(rows)}


@router.patch("/api/hackathons/{hackathon_id}/applicants/{application_id}/status")
def update_application_status(hackathon_id: int, application_id: int, body: dict):
    """Admin: update applicant status (REGISTERED / WITHDRAWN)."""
    status = body.get("status")
    if status not in ("REGISTERED", "WITHDRAWN"):
        raise HTTPException(status_code=400, detail="Status must be REGISTERED or WITHDRAWN.")
    conn = get_db_connection()
    conn.execute("UPDATE hackathon_applications SET status=? WHERE id=? AND hackathon_id=?",
                 (status, application_id, hackathon_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Application status updated to {status}."}


@router.delete("/api/hackathons/{hackathon_id}")
def delete_hackathon(hackathon_id: int):
    """Admin: delete a hackathon and all its applications (CASCADE)."""
    conn = get_db_connection()
    conn.execute("DELETE FROM hackathons WHERE id=?", (hackathon_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Hackathon #{hackathon_id} deleted."}
