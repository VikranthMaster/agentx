from datetime import datetime
from typing import List, Dict, Any
from app.services.contest_fetchers.utils import fetch_tle_contests
from loguru import logger

PLATFORM = "leetcode"

def fetch_contests(start_dt: datetime, end_dt: datetime) -> List[Dict[str, Any]]:
    """
    Fetches and normalizes LeetCode contests.
    """
    logger.info(f"Fetching {PLATFORM} contests...")
    raw_contests = fetch_tle_contests(start_dt, end_dt)
    
    normalized_contests = []
    for c in raw_contests:
        if c.get("platform") == PLATFORM:
            video_info = c.get("solutionVideoInfo") or {}
            has_video = bool(video_info.get("link"))
            video_url = video_info.get("link") if has_video else None
            
            normalized = {
                "platform": PLATFORM,
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
            
    logger.info(f"Found {len(normalized_contests)} normalized contests for {PLATFORM}.")
    return normalized_contests
