from datetime import datetime
from langchain_groq import ChatGroq
from app.config import REASONING_MODEL, GROQ_API_KEY
from app.state import GraphState
from app.tools.mock_data import get_student, load_communications, save_communications
import datetime as dt
from app.tools.google_calendar import create_event_with_reminder
from app.tools.mock_data import load_placements

llm = ChatGroq(model=REASONING_MODEL, api_key=GROQ_API_KEY, temperature=0)

def draft_email(student_name: str, purpose: str) -> str:
    """LLM drafts the actual email text — this is legitimate LLM work,
    unlike eligibility/attendance which must be deterministic."""
    prompt = f"""Draft a short, polite, professional email from a student named
{student_name} to college administration. Purpose: {purpose}
Keep it under 120 words. Include a subject line."""
    response = llm.invoke(prompt)
    return response.content


def send_notification(student_id: str, message: str) -> dict:
    data = load_communications()
    entry = {
        "student_id": student_id,
        "message": message,
        "timestamp": dt.datetime.now().isoformat(),
    }
    data["notifications"].append(entry)
    save_communications(data)
    return entry


def add_calendar_reminder(student_id: str, event_name: str, remind_before: str) -> dict:
    data = load_communications()
    entry = {
        "student_id": student_id,
        "event": event_name,
        "remind_before": remind_before,
        "created_at": dt.datetime.now().isoformat(),
    }
    data["calendar"].append(entry)
    save_communications(data)
    return entry


def save_email(student_id: str, content: str) -> dict:
    data = load_communications()
    entry = {
        "student_id": student_id,
        "content": content,
        "timestamp": dt.datetime.now().isoformat(),
    }
    data["emails"].append(entry)
    save_communications(data)
    return entry


def communication_node(state: GraphState) -> GraphState:
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]
    student = get_student(state["student_id"])
    student_name = student["name"] if student else state["student_id"]

    task_lower = task.lower()
    outputs = []

    if "email" in task_lower or "draft" in task_lower:
        email_content = draft_email(student_name, task)
        save_email(state["student_id"], email_content)
        outputs.append(f"Email drafted and saved:\n{email_content}")

    if "calendar" in task_lower or "remind" in task_lower:
        result_text = handle_calendar_and_reminder(state["student_id"], task)
        outputs.append(result_text)
    
    if "notif" in task_lower:
        send_notification(state["student_id"], task)
        outputs.append(f"Notification sent: {task}")

    if not outputs:
        outputs.append(f"No matching communication action found for: {task}")

    state["agent_outputs"].setdefault("communication", []).append(" | ".join(outputs))
    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state


def handle_calendar_and_reminder(student_id: str, task: str) -> str:
    data = load_placements()
    # find the relevant event by matching company name mentioned in task
    matched = next((e for e in data["events"] if e["company"].lower() in task.lower()), None)

    if not matched:
        return f"Could not find a matching event for: {task}"
    comms = load_communications()
    already_done = any(
        c.get("student_id") == student_id and c.get("event") == matched["name"]
        for c in comms.get("calendar", [])
    )
    if already_done:
        return f"'{matched['name']}' is already on your calendar with a reminder set."
    event_date = matched["date"]     # "2026-08-09"
    event_time = matched["time"]      # "2:00 PM"
    start_dt = dt.datetime.strptime(f"{event_date} {event_time}", "%Y-%m-%d %I:%M %p")

    result = create_event_with_reminder(
        summary=matched["name"],
        start_dt=start_dt,
        reminder_minutes_before=60,
    )

    if result["success"]:
        return f"Added '{matched['name']}' to your Google Calendar with a 1-hour reminder: {result['link']}"
    else:
        add_calendar_reminder(student_id, matched["name"], "1 hour before")
        return f"Google Calendar unavailable, saved '{matched['name']}' to local reminder instead."