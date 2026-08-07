"""
Placement Intelligence tools — deterministic fit scoring + LLM-phrased verdict.
The LLM never invents numbers; it only phrases what Python computed.
"""
import json
from typing import Optional
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.database import (
    get_db_connection,
    get_cached_job_skills,
    cache_job_skills,
    get_student_record,
    get_parsed_resume,
)
from app.memory.store import set_fact


# ── LLM helpers (Groq + 429 fallback) ─────────────────────────────────────────

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


# ── Skill extraction with caching ─────────────────────────────────────────────

def extract_required_skills(job: dict) -> list[str]:
    """
    Extract required skills from job requirements+description.
    Result is cached in `job_skill_cache` so repeated fit-checks for the same
    job don't re-invoke the LLM.
    """
    job_id = job.get("id")
    if job_id:
        cached = get_cached_job_skills(job_id)
        if cached:
            return cached

    prompt = f"""Extract a list of specific technical and professional skills required for this job.
Return ONLY a JSON array of short skill strings (e.g. ["Python", "Docker", "SQL"]).
No prose, no markdown fences — raw JSON array only.

Job Title: {job.get('title', '')}
Requirements: {job.get('requirements', '')}
Description: {job.get('description', '')}"""

    raw = _invoke_llm(prompt).strip()
    if raw.startswith("```"):
        raw = raw.strip("`").replace("json\n", "", 1).strip()
    try:
        skills = json.loads(raw)
        if isinstance(skills, list):
            skills = [str(s).strip() for s in skills if s]
        else:
            skills = []
    except json.JSONDecodeError:
        skills = []

    if job_id and skills:
        cache_job_skills(job_id, skills)

    return skills


# ── Deterministic scoring ──────────────────────────────────────────────────────

def compute_fit(
    student_skills: list[str],
    required_skills: list[str],
    student_branch: str,
    job_branch: Optional[str],
    resume_score: int,
) -> dict:
    """
    Weighted deterministic fit score — Python only, no LLM guessing.
      0.6 × skill_coverage
      0.2 × branch_match (1.0 if match, 0.4 if not)
      0.2 × resume_quality (resume_score / 100)
    """
    student_set = {s.lower().strip() for s in student_skills if s}
    required_set = {s.lower().strip() for s in required_skills if s}

    matched = student_set & required_set
    missing = required_set - student_set

    skill_coverage = len(matched) / len(required_set) if required_set else 1.0

    if not job_branch or job_branch.upper() in (student_branch or "").upper():
        branch_ok = 1.0
    else:
        branch_ok = 0.4

    resume_quality = min(resume_score, 100) / 100.0

    fit_score = round(
        (0.6 * skill_coverage + 0.2 * branch_ok + 0.2 * resume_quality) * 100
    )

    return {
        "fit_score": fit_score,
        "matched_skills": sorted(matched),
        "missing_skills": sorted(missing),
        "branch_match": branch_ok == 1.0,
        "skill_coverage_pct": round(skill_coverage * 100),
    }


# ── Shared verdict generator (deduplicated) ───────────────────────────────────

def generate_fit_verdict(job: dict, fit: dict) -> str:
    """
    Single shared function for generating natural language verdict from pre-computed fit numbers.
    Used by check_job_fit_tool, placement_fit_node, and the fit-check endpoint.
    """
    verdict_prompt = f"""A student is considering applying to '{job['title']}' at '{job['company']}'.
Computed fit data (use ONLY these numbers, do not invent or change them):
  fit_score: {fit['fit_score']}/100
  skill_coverage: {fit['skill_coverage_pct']}%
  branch_match: {fit['branch_match']}
  matched_skills: {fit['matched_skills']}
  missing_skills: {fit['missing_skills']}

Write exactly 3-4 sentences:
1. State the fit score plainly.
2. Name the top 2-3 missing skills if any (skip if none).
3. Give a concrete recommendation: should they apply now, upskill first, or apply anyway because matched skills outweigh the gap?
Be honest but encouraging. Do not repeat the raw numbers as a list — weave them into prose."""

    return _invoke_llm(verdict_prompt)


# ── Tool ───────────────────────────────────────────────────────────────────────

@tool
def check_job_fit_tool(student_id: str, job_id: int) -> str:
    """
    Analyze whether a student is a good fit for a job BEFORE applying.
    Returns a numeric fit score (0-100), matched skills, missing skills, and
    a natural-language verdict. Always call this before apply_for_job_tool unless
    the student explicitly says they already know they want to apply regardless of fit.

    Args:
        student_id: The student's roll number
        job_id: The integer ID of the job to evaluate
    """
    conn = get_db_connection()
    job_row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    conn.close()
    if not job_row:
        return f"Job ID {job_id} not found. Use get_jobs_tool to list available jobs."
    job = dict(job_row)

    student = get_student_record(student_id)
    if not student:
        return f"Student record not found for {student_id}."

    resume = get_parsed_resume(student_id)
    if not resume:
        return (
            "You don't have a parsed resume on file yet. "
            "Please upload a PDF/DOCX resume first, then call parse_resume_tool."
        )

    student_skills = resume.get("skills", [])
    resume_score = resume.get("resume_score", 0)

    required = extract_required_skills(job)

    fit = compute_fit(
        student_skills=student_skills,
        required_skills=required,
        student_branch=student.get("branch", ""),
        job_branch=job.get("branch"),
        resume_score=resume_score,
    )

    set_fact(student_id, f"last_fit_check_job_{job_id}", json.dumps(fit))

    verdict = generate_fit_verdict(job, fit)

    return (
        f"{verdict}\n\n"
        f"[fit_score={fit['fit_score']}/100 | "
        f"skill_coverage={fit['skill_coverage_pct']}% | "
        f"missing_skills={fit['missing_skills']}]"
    )
