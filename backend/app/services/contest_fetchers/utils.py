import time
import base64
import hashlib
import hmac
import requests
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Dict, Any
from urllib.parse import urlparse
from loguru import logger
from app.config import CONTEST_API_URL, CONTEST_API_SECRET

METHOD = "POST"
TZ = ZoneInfo("Asia/Kolkata")

def fetch_tle_contests(start_dt: datetime, end_dt: datetime) -> List[Dict[str, Any]]:
    """
    Fetches raw calendar contest data from the TLE Eliminators API.
    """
    url = CONTEST_API_URL
    encoded_secret = CONTEST_API_SECRET

    # Ensure datetimes are localized to Asia/Kolkata
    if start_dt.tzinfo is None:
        start_dt_tz = start_dt.replace(tzinfo=TZ)
    else:
        start_dt_tz = start_dt.astimezone(TZ)

    if end_dt.tzinfo is None:
        end_dt_tz = end_dt.replace(tzinfo=TZ)
    else:
        end_dt_tz = end_dt.astimezone(TZ)

    today = datetime.now(TZ)
    timestamp = str(int(time.time()))

    start_date_str = start_dt_tz.isoformat(timespec="milliseconds")
    end_date_str = end_dt_tz.isoformat(timespec="milliseconds")

    payload = {
        "startDate": start_date_str,
        "endDate": end_date_str,
        "filters": {
            "contestDivisionTypes": [],
            "eventTypesToDisplay": {
                "courseModulesAndInternalContests": False,
                "globalContests": True
            }
        },
        "userCalendarConfigurationStatus": {
            "isCalendarAccessibleToUser": True,
            "isCalendarConfigured": True,
            "calendarFilters": {
                "contestDivisionTypes": [],
                "eventTypesToDisplay": {
                    "courseModulesAndInternalContests": False,
                    "globalContests": True
                }
            }
        },
        "courseUrlIdentifier": None
    }

    # Generate Signature
    path = urlparse(url).path.rstrip("/").lower()
    message = f"{METHOD}:{path}:{timestamp}"

    # Decode and reverse secret
    secret = base64.b64decode(encoded_secret).decode("utf-8")[::-1]

    signature = hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "Origin": "https://www.tle-eliminators.com",
        "Referer": "https://www.tle-eliminators.com/",
        "Accept": "application/json",
        "x-timezone": "Asia/Kolkata",
        "x-local-date": today.strftime("%Y-%m-%d"),
        "x-timestamp": timestamp,
        "x-signature": signature,
    }

    try:
        logger.info(f"Sending POST request to TLE API for period {start_date_str} to {end_date_str}...")
        response = requests.post(url, json=payload, headers=headers, timeout=20)
        response.raise_for_status()
        data = response.json()
        contests = data.get("calendarData", [])
        logger.info(f"Successfully fetched {len(contests)} raw contests from TLE API.")
        return contests
    except Exception as e:
        logger.error(f"Error fetching from TLE API: {e}")
        raise e
