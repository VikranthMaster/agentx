from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username_or_id: str
    password: str

class RegisterStudentRequest(BaseModel):
    roll_no: str # e.g. 1602-24-733-160
    name: str
    email: str
    branch: str # CSE, CSE (AI/ML), ECE
    section: str # A, B
    year: int # 1, 2, 3, 4

class AttendancePostRequest(BaseModel):
    date: str # YYYY-MM-DD
    period: int # 1 to 6
    subject: str
    branch: str
    section: str
    posted_by: str
    present_student_ids: List[str]

class JobPostRequest(BaseModel):
    title: str
    company: str
    description: str
    requirements: str
    branch: Optional[str] = "CSE"
    posted_by: str
    create_calendar_event: Optional[bool] = True

class JobApplyRequest(BaseModel):
    job_id: int
    student_id: str

class AdminChatRequest(BaseModel):
    admin_id: str
    query: str
    session_id:str=None

class StudentChatRequest(BaseModel):
    student_id: str
    query: str

class TailorPreviewRequest(BaseModel):
    job_id: int
    student_id: str

class ApplyConfirmRequest(BaseModel):
    job_id: int
    student_id: str
    tailored_file: str

