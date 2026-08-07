from fastapi import APIRouter
from app.database import post_attendance_record, get_student_attendance
from app.schemas.models import AttendancePostRequest

router = APIRouter(tags=["Attendance"])

@router.post("/api/attendance/post")
def post_attendance(req: AttendancePostRequest):
    session_id = post_attendance_record(
        date=req.date,
        period=req.period,
        subject=req.subject,
        branch=req.branch,
        section=req.section,
        posted_by=req.posted_by,
        present_student_ids=req.present_student_ids
    )
    return {"status": "success", "session_id": session_id, "message": f"Attendance posted for Period {req.period} ({req.subject})"}

@router.get("/api/attendance/student/{student_id}")
def get_student_attendance_api(student_id: str):
    records = get_student_attendance(student_id)
    total = len(records)
    present = sum(1 for r in records if r["status"] == "PRESENT")
    percentage = round((present / total) * 100, 1) if total > 0 else 0

    by_date = {}
    for r in records:
        d = r["date"]
        if d not in by_date:
            by_date[d] = {}
        by_date[d][r["period"]] = r

    return {
        "student_id": student_id,
        "total_periods": total,
        "present_periods": present,
        "absent_periods": total - present,
        "attendance_percentage": percentage,
        "records": records,
        "by_date": by_date
    }
