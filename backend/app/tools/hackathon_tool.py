"""
Hackathon tools — get, register (HITL-staged), and ideate project ideas.
Registration reuses the existing stage_action_tool / confirm pattern from hitl_tools.py.
"""
import json
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.database import get_db_connection, get_hackathon, get_parsed_resume
from app.memory.store import set_fact, get_facts


# ── LLM helpers ────────────────────────────────────────────────────────────────

def _get_llm():
    from app.config import GROQ_API_KEY
    return ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)


def _invoke_llm(prompt: str) -> str:
    try:
        return _get_llm().invoke(prompt).content
    except Exception as e:
        if "429" in str(e) or "rate limit" in str(e).lower():
            from app.config import LOCAL_FALLBACK_MODEL
            return ChatOllama(model=LOCAL_FALLBACK_MODEL, temperature=0).invoke(prompt).content
        raise


# ── Tools ──────────────────────────────────────────────────────────────────────

@tool
def get_hackathons_tool() -> str:
    """
    List all currently open hackathons with registration deadlines, tech focus,
    and team size. Shows only hackathons where registration is still open.
    """
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT * FROM hackathons
           WHERE registration_deadline >= date('now')
           ORDER BY registration_deadline ASC"""
    ).fetchall()
    conn.close()

    if not rows:
        return "No open hackathons right now. Check back soon or ask an admin to post one!"

    lines = [f"Open Hackathons ({len(rows)} available):"]
    for r in rows:
        r = dict(r)
        lines.append(
            f"\n🏆 #{r['id']}: {r['title']}\n"
            f"   Tech Focus: {r.get('tech_focus', 'Open')}\n"
            f"   Dates: {r['start_date']} → {r['end_date']}\n"
            f"   Registration Deadline: {r['registration_deadline']}\n"
            f"   Team Size: up to {r.get('team_size_max', 4)} members\n"
            f"   {r.get('description', '')[:120]}..."
        )
    return "\n".join(lines)


@tool
def register_for_hackathon_tool(student_id: str, hackathon_id: int, team_name: str = None) -> str:
    """
    Stage a hackathon registration for confirmation — follows the same two-step
    pattern as job applications. This does NOT register immediately. The student
    must reply 'confirm' before the registration is submitted.

    Args:
        student_id: The student's roll number
        hackathon_id: ID of the hackathon to register for
        team_name: Optional team name
    """
    hackathon = get_hackathon(hackathon_id)
    if not hackathon:
        return f"Hackathon ID {hackathon_id} not found. Use get_hackathons_tool to see available ones."

    # Check already registered
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT id FROM hackathon_applications WHERE hackathon_id=? AND student_id=?",
        (hackathon_id, student_id)
    ).fetchone()
    conn.close()
    if existing:
        return f"You're already registered for '{hackathon['title']}'!"

    payload = {
        "hackathon_id": hackathon_id,
        "hackathon_title": hackathon["title"],
        "team_name": team_name,
    }
    set_fact(student_id, "pending_hackathon_registration", json.dumps(payload))

    return (
        f"I've prepared your registration for **{hackathon['title']}**!\n"
        f"- Tech Focus: {hackathon.get('tech_focus', 'Open')}\n"
        f"- Deadline: {hackathon['registration_deadline']}\n"
        f"- Team Name: {team_name or '(not set yet)'}\n\n"
        f"Reply **'confirm'** to submit your registration, or let me know if you'd like to change the team name first."
    )


@tool
def confirm_hackathon_registration_tool(student_id: str) -> str:
    """
    Step 2: Actually submit a staged hackathon registration.
    Only call this after the student explicitly confirms with 'confirm' or 'yes'.

    Args:
        student_id: The student's roll number
    """
    from datetime import datetime
    pending_raw = get_facts(student_id).get("pending_hackathon_registration")
    if not pending_raw:
        return "No pending hackathon registration. Ask me to register for a hackathon first."

    try:
        pending = json.loads(pending_raw)
    except Exception:
        return "Invalid pending registration data. Please try again."

    hackathon_id = pending["hackathon_id"]
    team_name = pending.get("team_name")
    title = pending.get("hackathon_title", f"Hackathon #{hackathon_id}")

    conn = get_db_connection()
    conn.execute(
        """INSERT INTO hackathon_applications
           (hackathon_id, student_id, team_name, status, applied_at)
           VALUES (?, ?, ?, 'REGISTERED', ?)""",
        (hackathon_id, student_id, team_name, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    set_fact(student_id, "pending_hackathon_registration", "")
    return (
        f"✅ You're registered for **{title}**!\n"
        f"- Team: {team_name or 'Solo / TBD'}\n"
        f"Good luck! Would you like me to brainstorm project ideas for this hackathon?"
    )


@tool
def ideate_hackathon_tool(student_id: str, hackathon_id: int, interests: str = "") -> str:
    """
    Brainstorm 3-4 concrete, buildable project ideas for a hackathon, grounded in
    the hackathon's tech focus AND the student's existing resume skills so the
    ideas are actually feasible — not generic.

    Args:
        student_id: The student's roll number
        hackathon_id: ID of the hackathon to brainstorm ideas for
        interests: Optional additional interests or constraints from the student
    """
    hackathon = get_hackathon(hackathon_id)
    if not hackathon:
        return f"Hackathon ID {hackathon_id} not found. Use get_hackathons_tool first."

    resume = get_parsed_resume(student_id)
    skills = resume.get("skills", []) if resume else []

    prompt = f"""Generate 3-4 concrete, buildable hackathon project ideas.

Hackathon: {hackathon['title']}
Tech Focus: {hackathon.get('tech_focus', 'Open')}
Description: {hackathon.get('description', '')}
Duration: {hackathon['start_date']} to {hackathon['end_date']}

Student's known skills: {skills if skills else '(no resume on file — suggest beginner-friendly ideas)'}
Student's stated interests: {interests if interests else '(none specified)'}

For each idea provide:
1. **Project name** — catchy, memorable
2. **One-line pitch** — what it does and who it's for
3. **Tech stack** — lean on skills the student already has; flag 1-2 new tools they'd need to pick up quickly
4. **Why it could win** — what makes it stand out for THIS specific hackathon's theme
5. **MVP scope** — what you can realistically build in the hackathon duration

Make the ideas specific and feasible, not generic. Avoid "build an app that does X" without detail."""

    return _invoke_llm(prompt)
