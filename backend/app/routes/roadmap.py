"""
Dedicated roadmap endpoint — bypasses the multi-step agent loop entirely.
Goes directly: request → _build_roadmap() → LLM → response.
This removes 2 extra LLM round-trips compared to routing through the chat agent.
"""
import asyncio
import functools
import json
from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_student_record, save_roadmap
from app.memory.store import get_facts
from app.memory.long_term import get_long_term_context
from app.data.curriculum_map import CURRICULUM_BY_YEAR
from app.tools.roadmap_tool import _build_roadmap

router = APIRouter(tags=["Roadmap"])


class RoadmapRequest(BaseModel):
    student_id: str
    topic: str
    weeks: int = 8


@router.post("/api/roadmap/generate")
async def generate_roadmap(req: RoadmapRequest):
    """
    Fast, direct roadmap generation — skips the agent loop.
    Single LLM call: context build → prompt → response.
    """
    student_id = req.student_id
    topic = req.topic.strip()
    weeks = max(1, min(req.weeks, 52))

    if not topic:
        return {"status": "error", "message": "topic is required"}

    student = get_student_record(student_id) or {}
    year = student.get("year", 3)
    curriculum = CURRICULUM_BY_YEAR.get(year, CURRICULUM_BY_YEAR[3])
    ltm_context = get_long_term_context(student_id)

    # Pull most recent job-fit gap if available
    gap_context = ""
    try:
        facts = get_facts(student_id)
        fit_keys = [k for k in facts if k.startswith("last_fit_check_job_")]
        if fit_keys:
            latest = json.loads(facts[fit_keys[-1]])
            missing = latest.get("missing_skills", [])
            if missing:
                gap_context = (
                    f"\nImportant: a recent job-fit analysis found these missing skills: {missing}. "
                    f"If any of these are relevant to '{topic}', weave them into the roadmap."
                )
    except Exception:
        pass

    # Run the single blocking LLM call in a thread-pool — never blocks the event loop
    loop = asyncio.get_event_loop()
    try:
        roadmap_text = await loop.run_in_executor(
            None,
            functools.partial(
                _build_roadmap,
                student=student,
                year=year,
                curriculum=curriculum,
                topic=topic,
                time_budget_weeks=weeks,
                ltm_context=ltm_context,
                gap_context=gap_context,
            )
        )
    except Exception as e:
        return {"status": "error", "message": f"Roadmap generation failed: {e}"}

    # Persist asynchronously — don't block the response
    try:
        await loop.run_in_executor(None, functools.partial(save_roadmap, student_id, topic, roadmap_text))
    except Exception:
        pass

    return {"status": "success", "reply": roadmap_text}
