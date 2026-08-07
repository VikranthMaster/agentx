"""
Roadmap Generator tool — produces personalised, curriculum-aware learning roadmaps.
Reads the student's academic year and completed subjects from curriculum_map.py
to avoid re-teaching known topics, and pulls job-fit gaps from student facts
when available so the roadmap directly closes placement skill gaps.
"""
import json
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.database import get_student_record, save_roadmap, get_parsed_resume
from app.memory.store import get_facts
from app.memory.long_term import get_long_term_context
from app.data.curriculum_map import CURRICULUM_BY_YEAR


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


# ── Helper used by the graph node (agent-to-agent path) ───────────────────────

def generate_roadmap_from_gaps(student_id: str, missing_skills: list[str], topic: str = "", time_budget_weeks: int = 8) -> str:
    """
    Called directly by the roadmap_node in the LangGraph when the placement_fit
    agent has already identified missing skills. The topic is derived from the
    missing skills list if not explicitly provided.
    """
    if not topic:
        topic = f"skills: {', '.join(missing_skills[:5])}" if missing_skills else "general placement preparation"

    student = get_student_record(student_id) or {}
    year = student.get("year", 3)
    curriculum = CURRICULUM_BY_YEAR.get(year, CURRICULUM_BY_YEAR[3])
    ltm = get_long_term_context(student_id)

    gap_note = (
        f"\nCritical note: focus the roadmap on closing these specific missing skills "
        f"identified by a job-fit analysis: {missing_skills}."
        if missing_skills else ""
    )

    return _build_roadmap(
        student=student,
        year=year,
        curriculum=curriculum,
        topic=topic,
        time_budget_weeks=time_budget_weeks,
        ltm_context=ltm,
        gap_context=gap_note,
    )


def _build_roadmap(student, year, curriculum, topic, time_budget_weeks, ltm_context, gap_context="") -> str:
    prompt = f"""Create a {time_budget_weeks}-week personalised learning roadmap for the topic: {topic}

Student context:
- Academic Year: {year} (out of 4)
- Branch: {student.get('branch', 'CSE')}
- Long-term profile: {ltm_context}

Already covered in curriculum — do NOT re-teach from scratch, build on these:
{curriculum['completed']}

Currently studying (can reference but assume partial knowledge):
{curriculum['in_progress']}
{gap_context}

Structure your roadmap as:
1. Phase breakdown (Week 1-2 / Week 3-5 / Week 6-8 style, adjusted to {time_budget_weeks} weeks)
2. For each phase: specific resources (free YouTube channels, docs, books where known), hands-on tasks
3. Assume the "already covered" list as prior knowledge — start from there, not from basics
4. Flag: which parts are exam-critical vs placement-critical
5. End with 2 concrete mini-project ideas that would look strong on a resume
6. Keep it actionable — no vague advice like "learn Python"; say "complete FastAPI tutorial + build a REST CRUD API"

Be specific, opinionated, and practical."""

    return _invoke_llm(prompt)


# ── LangChain @tool ────────────────────────────────────────────────────────────

@tool
def generate_roadmap_tool(student_id: str, topic: str, time_budget_weeks: int = 8) -> str:
    """
    Generate a personalised learning roadmap for a topic (e.g. 'system design',
    'networking', 'ML for placements', 'full-stack web development'), tailored to
    the student's academic year and curriculum so it builds on what they already know.
    Automatically integrates any job-fit skill gaps if a recent fit-check is on file.

    Args:
        student_id: The student's roll number
        topic: The subject or skill area to build a roadmap for
        time_budget_weeks: Number of weeks available (default 8)
    """
    student = get_student_record(student_id) or {}
    year = student.get("year", 3)
    curriculum = CURRICULUM_BY_YEAR.get(year, CURRICULUM_BY_YEAR[3])
    ltm_context = get_long_term_context(student_id)

    # Pull most recent job-fit gap if available (agent-to-agent data flow)
    gap_context = ""
    facts = get_facts(student_id)
    fit_keys = [k for k in facts if k.startswith("last_fit_check_job_")]
    if fit_keys:
        try:
            latest = json.loads(facts[fit_keys[-1]])
            missing = latest.get("missing_skills", [])
            if missing:
                gap_context = (
                    f"\nImportant: a recent job-fit analysis found these missing skills: {missing}. "
                    f"If any of these are relevant to '{topic}', weave them into the roadmap."
                )
        except Exception:
            pass

    roadmap_text = _build_roadmap(
        student=student,
        year=year,
        curriculum=curriculum,
        topic=topic,
        time_budget_weeks=time_budget_weeks,
        ltm_context=ltm_context,
        gap_context=gap_context,
    )

    # Persist for later retrieval
    try:
        save_roadmap(student_id, topic, roadmap_text)
    except Exception:
        pass  # don't fail if DB write fails

    return roadmap_text
