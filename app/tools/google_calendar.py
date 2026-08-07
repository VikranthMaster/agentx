import datetime
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
ROOT = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = ROOT / "token.json"
CREDS_PATH = ROOT / "credentials.json"

def get_calendar_service():
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)   # opens browser for consent, first time only
        TOKEN_PATH.write_text(creds.to_json())

    return build("calendar", "v3", credentials=creds)


def create_event_with_reminder(summary: str, start_dt: datetime.datetime,
                                  duration_minutes: int = 60,
                                  reminder_minutes_before: int = 60) -> dict:
    """Returns {'success': True, 'link': ...} or {'success': False, 'error': ...}
    so the caller can fall back to the mock calendar on failure."""
    try:
        service = get_calendar_service()
        end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)

        event = {
            "summary": summary,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": "Asia/Kolkata"},
            "reminders": {
                "useDefault": False,
                "overrides": [{"method": "popup", "minutes": reminder_minutes_before}],
            },
        }
        created = service.events().insert(calendarId="primary", body=event).execute()
        return {"success": True, "link": created.get("htmlLink")}
    except Exception as e:
        return {"success": False, "error": str(e)}