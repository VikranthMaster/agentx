import os
from fastapi import APIRouter, File, UploadFile, Form
from app.database import get_db_connection
from app.schemas.models import AdminChatRequest
from app.agents.admin_assistant import process_admin_query
from app.agents.student_assistant import process_student_query
from app.agents.resume_parser import parse_resume_with_llm
#addded this
from app.memory.chat_logger import log_message
from app.tools.ocr_tool import extract_text

router = APIRouter(tags=["AI Agents Chatbot"])

UPLOAD_RESUME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "resumes")
os.makedirs(UPLOAD_RESUME_DIR, exist_ok=True)

@router.post("/api/chat/admin")
def chat_admin(req: AdminChatRequest):
    log_message(req.admin_id, "admin", "user", req.query, session_id=req.session_id)
    result = process_admin_query(req.admin_id, req.query)
    log_message(req.admin_id, "admin", "assistant", result.get("reply", ""), trace=result.get("trace"), session_id=req.session_id)
    return result

@router.post("/api/chat/student/multimodal")
async def chat_student_multimodal(
    student_id: str = Form(...),
    query: str = Form(...),
    session_id: str = Form(None),
    file: UploadFile = File(None)
):
    # If the student attached a file, read it immediately
    if file:
        content = await file.read()
        
        try:
            # Extract text using the OCR tool from the Exam Assessor step
            extracted_text = extract_text(file.filename, content)
            
            # Inject the extracted notes directly into the prompt context for this specific message
            if extracted_text and extracted_text.strip():
                query += f"\n\n--- UPLOADED FILE CONTENT ({file.filename}) ---\n{extracted_text}\n--- END OF FILE ---\n\n(System Note: Answer the student's question using the text provided above.)"
            else:
                query += f"\n\n[System Note: Student uploaded {file.filename}, but it appeared blank or no text was found.]"
        except Exception as e:
            query += f"\n\n[System Note: Student uploaded {file.filename}, but text extraction failed: {str(e)}]"

    # Log the message with the appended text, then send to the agent
    log_message(student_id, "student", "user", query, session_id=session_id)
    
    # Process the query (the agent will now "see" the document text inside the query string)
    result = process_student_query(student_id, query)
    
    log_message(student_id, "student", "assistant", result.get("reply", ""), trace=result.get("trace"), session_id=session_id)
    
    return result