"""
Roadmap LangGraph node — reads placement_fit agent's structured output from
GraphState and generates a targeted roadmap to close the identified skill gaps.
This is the agent-to-agent handoff: agent B (roadmap) consumes agent A's
(placement_fit) structured output directly from shared state, not from a re-prompt.
"""
from app.state import GraphState
from app.tools.roadmap_tool import generate_roadmap_from_gaps
from app.database import get_student_record
from datetime import datetime


def roadmap_node(state: GraphState) -> GraphState:
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]

    # ── Read placement_fit output from shared state (A2A handoff) ──────────────
    prior_fit = state["agent_outputs"].get("placement_structured")
    missing_skills = []
    if prior_fit and isinstance(prior_fit, dict):
        missing_skills = prior_fit.get("missing_skills", [])

    # If task is a generic orchestrator prompt, clean up topic
    generic_phrases = ["generate roadmap", "missing skills", "roadmap for", "skill gap"]
    if missing_skills and any(g in task.lower() for g in generic_phrases):
        topic = f"skills: {', '.join(missing_skills[:5])}"
    else:
        topic = task

    # Record timestamp for trace
    state.setdefault("step_timestamps", {})[f"roadmap_{idx}"] = datetime.now().isoformat()

    student_id = state["student_id"]
    student = get_student_record(student_id)
    if not student:
        state["agent_outputs"].setdefault("roadmap", []).append(
            f"No student record found for '{student_id}'."
        )
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    try:
        roadmap_text = generate_roadmap_from_gaps(
            student_id=student_id,
            missing_skills=missing_skills,
            topic=topic,
            time_budget_weeks=8,
        )
    except Exception as e:
        roadmap_text = f"Roadmap generation failed: {e}"

    # Write text output (for finalize_node) + structured channel (for communication_node)
    state["agent_outputs"].setdefault("roadmap", []).append(roadmap_text)
    state["agent_outputs"]["roadmap_structured"] = {"content": roadmap_text, "topic": topic}

    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state
