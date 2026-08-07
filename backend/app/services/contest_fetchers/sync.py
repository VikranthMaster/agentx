from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Dict, Any
from loguru import logger

from app.services.contest_fetchers.utils import fetch_tle_contests, TZ
from app.database import save_contests

def sync_all_contests(days_past: int = 30, days_future: int = 60) -> List[Dict[str, Any]]:
    """
    Fetches all platform contests from TLE Eliminators API and persists them to DB.
    """
    now = datetime.now(TZ)
    start_dt = now - timedelta(days=days_past)
    end_dt = now + timedelta(days=days_future)

    logger.info(f"Syncing contests from {start_dt.isoformat()} to {end_dt.isoformat()}...")
    raw_contests = fetch_tle_contests(start_dt, end_dt)

    normalized_contests = []
    for c in raw_contests:
        video_info = c.get("solutionVideoInfo") or {}
        has_video = bool(video_info.get("link"))
        video_url = video_info.get("link") if has_video else None

        normalized = {
            "platform": c.get("platform", "unknown"),
            "contest_name": c.get("name"),
            "contest_url": c.get("link"),
            "start_time": c.get("startDate"),
            "end_time": c.get("endDate"),
            "duration": c.get("duration"),
            "has_solution_video": has_video,
            "solution_video_url": video_url,
            "external_id": c.get("_id"),
            "source": "tle",
            "contest_type": c.get("type"),
            "division_types": c.get("contestDivisionTypes") or []
        }
        normalized_contests.append(normalized)

    save_contests(normalized_contests)
    logger.info(f"Saved {len(normalized_contests)} contests to SQLite database.")
    return normalized_contests
