from fastapi import APIRouter, HTTPException
from app.database import get_db_connection, register_student
from app.schemas.models import LoginRequest, RegisterStudentRequest

router = APIRouter(tags=["Authentication & Users"])

@router.post("/api/auth/login")
@router.post("/api/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id=? OR email=?", (req.username_or_id, req.username_or_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid username/roll number or password.")
    user = dict(row)
    if user.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid password.")
    user.pop("password", None)
    return {"status": "success", "user": user}

@router.post("/api/students/register")
@router.post("/api/students/add")
def add_student(req: RegisterStudentRequest):
    register_student(roll_no=req.roll_no, name=req.name, email=req.email, branch=req.branch, section=req.section, year=req.year)
    return {"status": "success", "message": f"Student {req.name} ({req.roll_no}) registered successfully."}

@router.get("/api/users")
def get_users(branch: str = None, section: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    q = "SELECT id, name, email, role, branch, section, year FROM users WHERE 1=1"
    params = []
    if branch:
        q += " AND branch=?"
        params.append(branch)
    if section:
        q += " AND section=?"
        params.append(section)
    cursor.execute(q, params)
    users = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"users": users}
