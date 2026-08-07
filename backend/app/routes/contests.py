from datetime import datetime, timedelta
from fastapi import APIRouter
from app.database import get_contests_from_db
from app.services.contest_fetchers.sync import sync_all_contests

router = APIRouter(tags=["Competitive Programming Contests"])

@router.get("/api/contests")
def get_contests(sync: bool = False):
    try:
        if sync:
            sync_all_contests()
        contests = get_contests_from_db()
        if not contests and not sync:
            sync_all_contests()
            contests = get_contests_from_db()
        return {"status": "success", "contests": contests}
    except Exception as e:
        return {"status": "error", "message": str(e), "contests": []}

@router.post("/api/contests/sync")
def sync_contests():
    try:
        contests = sync_all_contests()
        return {"status": "success", "synced_count": len(contests)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/contests/gcal")
def add_contest_to_gcal(body: dict):
    title = body.get("title", "Coding Contest")
    start_time_str = body.get("start_time")
    duration_secs = body.get("duration_seconds", 7200)

    try:
        from app.tools.google_calendar import create_event_with_reminder
        start_dt = datetime.fromisoformat(start_time_str) if start_time_str else datetime.now() + timedelta(days=1)
        duration_minutes = max(int(duration_secs // 60), 30)

        cal_res = create_event_with_reminder(
            summary=f"Contest: {title}",
            start_dt=start_dt,
            duration_minutes=duration_minutes
        )
        return cal_res
    except Exception as e:
        return {"success": False, "error": str(e)}
