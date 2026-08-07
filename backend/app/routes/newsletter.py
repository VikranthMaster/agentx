from typing import Optional
from fastapi import APIRouter, Form, Request
from pydantic import BaseModel
from app.database import add_newsletter_subscriber, remove_newsletter_subscriber
from app.services.newsletter_service import send_newsletter_sync

router = APIRouter(tags=["Newsletter"])


class SubscribeRequest(BaseModel):
    email: str
    student_id: Optional[str] = None


@router.post("/api/newsletter/subscribe")
async def subscribe(request: Request):
    """Subscribe an email address to the campus newsletter. Accepts JSON or Form data."""
    email = None
    student_id = None

    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
            email = data.get("email")
            student_id = data.get("student_id")
        else:
            form = await request.form()
            email = form.get("email")
            student_id = form.get("student_id")

        if not email or not str(email).strip():
            return {"status": "error", "message": "Email address is required."}

        add_newsletter_subscriber(str(email).strip(), str(student_id).strip() if student_id else None)
        return {"status": "success", "message": f"{email} subscribed to the Smart Campus newsletter."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/api/newsletter/unsubscribe")
async def unsubscribe(request: Request):
    """Unsubscribe an email address from the newsletter."""
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
            email = data.get("email")
        else:
            form = await request.form()
            email = form.get("email")

        if not email or not str(email).strip():
            return {"status": "error", "message": "Email address is required."}

        remove_newsletter_subscriber(str(email).strip())
        return {"status": "success", "message": f"{email} has been unsubscribed."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/api/newsletter/send-now")
def send_now(force: bool = True):
    """
    Admin-only: manually trigger the newsletter send.
    Bypasses the 'already sent today' guard by default (force=True).
    Returns the send result synchronously so the admin can see the outcome.
    """
    result = send_newsletter_sync(force=force)
    return result
