import os
import json
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from app.database import get_db_connection
from app.agents.resume_parser import parse_resume_with_llm

router = APIRouter(tags=["Resumes & Profiles"])

UPLOAD_RESUME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "resumes")
os.makedirs(UPLOAD_RESUME_DIR, exist_ok=True)

@router.post("/api/resume/upload")
def upload_resume(
    student_id: str = Form(...),
    file: UploadFile = File(...)
):
    save_filename = f"{student_id}_{file.filename}"
    save_path = os.path.join(UPLOAD_RESUME_DIR, save_filename)

    with open(save_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    parsed_result = parse_resume_with_llm(save_path, student_id)
    return {
        "status": "success",
        "student_id": student_id,
        "profile": parsed_result
    }

@router.get("/api/resume/student/{student_id}")
def get_student_resume(student_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM resumes WHERE student_id=?", (student_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"has_resume": False, "profile": None}

    rdict = dict(row)
    try:
        rdict["parsed_json"] = json.loads(rdict["parsed_json"])
    except Exception:
        pass

    return {"has_resume": True, "profile": rdict}

@router.get("/api/resume/tailored/{filename}")
def get_tailored_resume_file(filename: str):
    # Prevent directory traversal
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_RESUME_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Tailored resume file not found.")
    return FileResponse(file_path, media_type="text/html")
