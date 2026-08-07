from fastapi import APIRouter
from app.memory.chat_logger import get_logs_for_actor, get_all_logs

router = APIRouter(tags=["Chat Logs"])

@router.get("/api/chat-logs/{actor_id}")
def get_actor_logs(actor_id: str, limit: int = 200):
    return {"actor_id": actor_id, "logs": get_logs_for_actor(actor_id, limit)}

@router.get("/api/chat-logs")
def get_all(actor_type: str = None, limit: int = 500):
    return {"logs": get_all_logs(actor_type, limit)}