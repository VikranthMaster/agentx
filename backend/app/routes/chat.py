import os
import asyncio
import functools
from fastapi import APIRouter, BackgroundTasks, File, UploadFile, Form
from app.database import get_db_connection
from app.schemas.models import AdminChatRequest
from app.agents.admin_assistant import process_admin_query
from app.agents.student_assistant import process_student_query
from app.agents.resume_parser import parse_resume_with_llm
from app.memory.chat_logger import log_message, get_logs_for_actor
from app.tools.ocr_tool import extract_text

router = APIRouter(tags=["AI Agents Chatbot"])

UPLOAD_RESUME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "resumes")
os.makedirs(UPLOAD_RESUME_DIR, exist_ok=True)


@router.post("/api/chat/admin")
def chat_admin(req: AdminChatRequest):
    log_message(req.admin_id, "admin", "user", req.query, session_id=req.session_id)
    result = process_admin_query(req.admin_id, req.query)
    log_message(req.admin_id, "admin", "assistant", result.get("reply", ""),
                trace=result.get("trace"), session_id=req.session_id)
    return result


@router.post("/api/chat/student/multimodal")
async def chat_student_multimodal(
    background_tasks: BackgroundTasks,
    student_id: str = Form(...),
    query: str = Form(...),
    session_id: str = Form(None),
    file: UploadFile = File(None),
):
    # If the student attached a file, read it immediately
    if file:
        content = await file.read()
        try:
            extracted_text = extract_text(file.filename, content)
            if extracted_text and extracted_text.strip():
                query += (
                    f"\n\n--- UPLOADED FILE CONTENT ({file.filename}) ---\n"
                    f"{extracted_text}\n--- END OF FILE ---\n\n"
                    f"(System Note: Answer the student's question using the text provided above.)"
                )
            else:
                query += f"\n\n[System Note: Student uploaded {file.filename}, but it appeared blank or no text was found.]"
        except Exception as e:
            query += f"\n\n[System Note: Student uploaded {file.filename}, but text extraction failed: {str(e)}]"

    # Log the user turn
    log_message(student_id, "student", "user", query, session_id=session_id)

    # ── Run blocking LLM call in a thread-pool — never blocks the event loop ──
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        functools.partial(process_student_query, student_id, query)
    )

    # Log the assistant reply
    log_message(student_id, "student", "assistant", result.get("reply", ""),
                trace=result.get("trace"), session_id=session_id)

    # Trigger long-term memory summarization every 10 turns (background, non-blocking)
    try:
        all_logs = get_logs_for_actor(student_id)
        if len(all_logs) % 10 == 0 and len(all_logs) >= 10 and session_id:
            from app.memory.long_term import summarize_session
            background_tasks.add_task(summarize_session, student_id, session_id)
    except Exception:
        pass  # never let LTM errors break the chat response

    return result