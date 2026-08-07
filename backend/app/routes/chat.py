import os
from fastapi import APIRouter, File, UploadFile, Form
from app.database import get_db_connection
from app.schemas.models import AdminChatRequest
from app.agents.admin_assistant import process_admin_query
from app.agents.student_assistant import process_student_query
from app.agents.resume_parser import parse_resume_with_llm

router = APIRouter(tags=["AI Agents Chatbot"])

UPLOAD_RESUME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "resumes")
os.makedirs(UPLOAD_RESUME_DIR, exist_ok=True)

@router.post("/api/chat/admin")
def chat_admin(req: AdminChatRequest):
    result = process_admin_query(req.admin_id, req.query)
    return result

@router.post("/api/chat/student/multimodal")
def chat_student_multimodal(
    student_id: str = Form(...),
    query: str = Form(...),
    file: UploadFile = File(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM users WHERE id=?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    student_name = dict(row)["name"] if row else student_id

    if file and file.filename:
        save_filename = f"{student_id}_{file.filename}"
        save_path = os.path.join(UPLOAD_RESUME_DIR, save_filename)
        with open(save_path, "wb") as f:
            content = file.file.read()
            f.write(content)

        if any(file.filename.lower().endswith(ext) for ext in [".pdf", ".docx", ".txt"]):
            parsed = parse_resume_with_llm(save_path, student_id)
            score = parsed.get("resume_score", 0)
            domain = parsed.get("domain", "N/A")
            return {
                "action": "parse_file",
                "reply": (
                    f"I've parsed your uploaded file **{file.filename}** using Groq LLM Agent.\n"
                    f"- ATS Score: **{score}/100**\n"
                    f"- Domain: **{domain}**\n"
                    f"- Profile saved to campus database. Go to the Resume Profile tab to view full details."
                ),
                "parsed_profile": parsed,
            }
        else:
            file_note = f"[Student uploaded a file: {file.filename}] "
            query = file_note + query

    result = process_student_query(student_id, query, student_name=student_name)
    return result
