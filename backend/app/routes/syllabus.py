import os
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from app.database import get_db_connection

router = APIRouter(tags=["Syllabus"])

UPLOAD_SYLLABUS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "syllabus")
os.makedirs(UPLOAD_SYLLABUS_DIR, exist_ok=True)

@router.post("/api/syllabus/upload")
def upload_syllabus(
    subject: str = Form(...),
    branch: str = Form(...),
    semester: int = Form(...),
    file: UploadFile = File(...)
):
    save_filename = f"{branch}_sem{semester}_{subject}_{file.filename}"
    save_path = os.path.join(UPLOAD_SYLLABUS_DIR, save_filename)

    with open(save_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO syllabus (subject, branch, semester, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?)",
        (subject, branch, semester, save_path, now)
    )
    conn.commit()
    conn.close()

    return {"status": "success", "message": f"Syllabus for {subject} uploaded successfully."}

@router.get("/api/syllabus")
def get_syllabus(branch: str = None, semester: int = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM syllabus WHERE 1=1"
    params = []
    if branch:
        query += " AND branch = ?"
        params.append(branch)
    if semester:
        query += " AND semester = ?"
        params.append(semester)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"syllabus": rows}

@router.get("/api/syllabus/download/{syllabus_id}")
def download_syllabus(syllabus_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM syllabus WHERE id=?", (syllabus_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Syllabus file not found.")

    file_path = row["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server.")

    return FileResponse(file_path, filename=os.path.basename(file_path))
