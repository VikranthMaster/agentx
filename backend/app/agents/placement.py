"""
Placement agents:
 - placement_node: existing eligibility check (mock data compatible, unchanged)
 - placement_fit_node: NEW — job fit + gap analysis using real DB + placement_tool.py
   Writes placement_structured channel for downstream roadmap_node consumption.
"""
from datetime import datetime
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from app.config import GROQ_API_KEY, LOCAL_FALLBACK_MODEL
from app.state import GraphState
from app.tools.mock_data import get_student, load_placements, save_placements

llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)


def _invoke_llm(prompt: str) -> str:
    try:
        return llm.invoke(prompt).content
    except Exception as e:
        if "429" in str(e) or "rate limit" in str(e).lower():
            return ChatOllama(model=LOCAL_FALLBACK_MODEL, temperature=0).invoke(prompt).content
        raise


def check_eligibility(student: dict, company: dict) -> dict:
    """Deterministic eligibility check — real logic, not LLM guessing."""
    reasons = []
    eligible = True

    if student["cgpa"] < company["min_cgpa"]:
        eligible = False
        reasons.append(f"CGPA {student['cgpa']} below required {company['min_cgpa']}")
    if student["branch"] not in company["eligible_branches"]:
        eligible = False
        reasons.append(f"Branch {student['branch']} not eligible")
    if student["year"] < company["min_year"]:
        eligible = False
        reasons.append(f"Year {student['year']} below required {company['min_year']}")
    if student.get("backlogs", 0) > company["backlogs_allowed"]:
        eligible = False
        reasons.append(f"Backlogs exceed allowed {company['backlogs_allowed']}")

    return {"eligible": eligible, "reasons": reasons}


def register_for_event(student_id: str, company_name: str) -> str:
    data = load_placements()
    event = next((e for e in data["events"] if e["company"].lower() == company_name.lower()), None)
    if not event:
        return f"No workshop found for {company_name}."
    if student_id not in event["registered_students"]:
        event["registered_students"].append(student_id)
        save_placements(data)
    return f"Registered for {event['name']} on {event['date']} at {event['time']}."


# ── Existing eligibility node (unchanged behaviour) ────────────────────────────

def placement_node(state: GraphState) -> GraphState:
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]
    student = get_student(state["student_id"])
    data = load_placements()

    if not student:
        state["agent_outputs"].setdefault("placement", []).append(
            f"No student record for '{state['student_id']}'."
        )
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    company = next(
        (c for c in data["companies"] if c["name"].lower() in task.lower()), None
    )

    if company:
        result = check_eligibility(student, company)
        prompt = f"""Student: {student['name']}, CGPA {student['cgpa']}, Year {student['year']}, Branch {student['branch']}
Task: {task}
Computed eligibility result: {result}

Answer in ONE plain sentence using ONLY the computed result above. Do not print the raw dictionary or JSON — write it as natural language. Do not invent criteria."""
        output = _invoke_llm(prompt)

        if result["eligible"] and "register" in task.lower():
            output += " " + register_for_event(state["student_id"], company["name"])
    else:
        output = f"Could not match a known company in task: '{task}'"

    state["agent_outputs"].setdefault("placement", []).append(output)
    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state


# ── NEW: placement_fit_node — job fit + gap analysis (real DB) ─────────────────

def placement_fit_node(state: GraphState) -> GraphState:
    """
    Analyse whether a student is a fit for a specific job.
    Reads from real campus.db (not mock data).
    Writes:
      - state["agent_outputs"]["placement_fit"] — text for finalize_node
      - state["agent_outputs"]["placement_structured"] — dict for roadmap_node (A2A handoff)
    """
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]
    student_id = state["student_id"]

    # Record timestamp for trace
    state.setdefault("step_timestamps", {})[f"placement_fit_{idx}"] = datetime.now().isoformat()

    from app.database import get_db_connection, get_student_record, get_parsed_resume
    from app.tools.placement_tool import extract_required_skills, compute_fit

    student = get_student_record(student_id)
    if not student:
        msg = f"No real student record found for '{student_id}' in campus.db."
        state["agent_outputs"].setdefault("placement_fit", []).append(msg)
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    resume = get_parsed_resume(student_id)
    if not resume:
        msg = "No parsed resume on file. Student needs to upload and parse their resume first."
        state["agent_outputs"].setdefault("placement_fit", []).append(msg)
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    # Try to extract job_id from task
    import re
    job_id_match = re.search(r'\b(\d+)\b', task)
    job = None
    if job_id_match:
        conn = get_db_connection()
        job_row = conn.execute("SELECT * FROM jobs WHERE id=?", (int(job_id_match.group(1)),)).fetchone()
        conn.close()
        if job_row:
            job = dict(job_row)

    if not job:
        # Try matching by company/title keywords in task
        conn = get_db_connection()
        all_jobs = [dict(r) for r in conn.execute("SELECT * FROM jobs ORDER BY id DESC").fetchall()]
        conn.close()
        for j in all_jobs:
            if j["company"].lower() in task.lower() or j["title"].lower() in task.lower():
                job = j
                break

    if not job:
        msg = f"Could not find a job matching the task description: '{task}'"
        state["agent_outputs"].setdefault("placement_fit", []).append(msg)
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    required_skills = extract_required_skills(job)
    student_skills = resume.get("skills", [])
    resume_score = resume.get("resume_score", 0)

    fit = compute_fit(
        student_skills=student_skills,
        required_skills=required_skills,
        student_branch=student.get("branch", ""),
        job_branch=job.get("branch"),
        resume_score=resume_score,
    )

    verdict_prompt = f"""A student is evaluating fit for '{job['title']}' at '{job['company']}'.
Computed fit data (use ONLY these numbers):
  fit_score: {fit['fit_score']}/100, skill_coverage: {fit['skill_coverage_pct']}%,
  matched_skills: {fit['matched_skills']}, missing_skills: {fit['missing_skills']}
Write 2-3 sentences stating the score and key missing skills. Be factual and concise."""

    verdict = _invoke_llm(verdict_prompt)
    output = (
        f"{verdict}\n"
        f"[fit_score={fit['fit_score']}/100 | missing={fit['missing_skills']}]"
    )

    # Text output for finalize_node
    state["agent_outputs"].setdefault("placement_fit", []).append(output)

    # Structured channel for roadmap_node — this IS the agent-to-agent handoff
    state["agent_outputs"]["placement_structured"] = fit

    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state
