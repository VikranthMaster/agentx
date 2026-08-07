from fastapi import APIRouter
from app.memory.chat_logger import get_logs_for_actor, get_all_logs

router = APIRouter(tags=["Chat Logs"])


@router.get("/api/chat-logs/{actor_id}")
def get_actor_logs(actor_id: str, limit: int = 200):
    return {"actor_id": actor_id, "logs": get_logs_for_actor(actor_id, limit)}


@router.get("/api/chat-logs")
def get_all(actor_type: str = None, limit: int = 500):
    return {"logs": get_all_logs(actor_type, limit)}


@router.get("/api/chat-logs/{actor_id}/latest-trace")
def latest_trace(actor_id: str):
    """
    Return the structured agent-to-agent trace from the most recent graph run
    for this actor. Used for the demo: shows Orchestrator → Placement Fit →
    Roadmap → Communication with actual data values flowing between agents.
    """
    logs = get_logs_for_actor(actor_id)
    last_with_trace = next(
        (l for l in reversed(logs) if l.get("trace")), None
    )
    if not last_with_trace:
        return {"actor_id": actor_id, "trace": []}

    trace = last_with_trace["trace"]

    # If it's a graph run, the _graph_trace is embedded in agent_outputs
    # For single-agent runs, return the tool-call trace directly
    return {
        "actor_id": actor_id,
        "session_id": last_with_trace.get("session_id"),
        "created_at": last_with_trace.get("created_at"),
        "trace": trace,
    }