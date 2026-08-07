"""
Generic human-in-the-loop staging, reusing the same set_fact/get_facts
pattern already proven by apply_for_job_tool / confirm_application_tool.
"""
import json
from langchain_core.tools import tool
from app.memory.store import set_fact, get_facts

@tool
def stage_action_tool(actor_id: str, action_type: str, payload: dict) -> str:
    """
    Stage a sensitive action for human approval instead of executing it
    immediately. Use this for irreversible or high-impact admin actions
    (posting attendance, posting a job) instead of executing directly.

    Args:
        actor_id: admin/student id staging the action
        action_type: short name, e.g. 'post_attendance' or 'post_job'
        payload: the exact arguments to execute once approved
    """
    set_fact(actor_id, f"pending_{action_type}", json.dumps(payload))
    return (
        f"I've prepared this **{action_type}** action but haven't executed it yet:\n"
        f"{json.dumps(payload, indent=2)}\n\n"
        f"Reply 'confirm' to execute it, or tell me what to change."
    )

@tool
def get_pending_action_tool(actor_id: str, action_type: str) -> str:
    """Retrieve a staged action's payload for confirmation. Returns 'NONE' if nothing pending."""
    raw = get_facts(actor_id).get(f"pending_{action_type}")
    return raw or "NONE"

@tool
def clear_pending_action_tool(actor_id: str, action_type: str) -> str:
    """Clear a staged action after it's been executed or rejected."""
    set_fact(actor_id, f"pending_{action_type}", "")
    return "Cleared."