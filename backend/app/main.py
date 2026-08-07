from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_contests_from_db
from app.services.contest_fetchers.sync import sync_all_contests

from app.routes.auth import router as auth_router
from app.routes.attendance import router as attendance_router
from app.routes.syllabus import router as syllabus_router
from app.routes.resumes import router as resumes_router
from app.routes.jobs import router as jobs_router
from app.routes.contests import router as contests_router
from app.routes.chat import router as chat_router
from app.routes.newsletter import router as newsletter_router
from app.routes.hackathons import router as hackathons_router

#added this
from app.routes.chat_logs import router as chat_logs_router
from app.routes.exam_assessment import router as exam_router

app = FastAPI(title="Smart Campus ERP Multi-Agent System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        contests = get_contests_from_db()
        if not contests:
            sync_all_contests()
    except Exception as e:
        print("[Startup] Contest sync warning:", e)

    # Fire-and-forget newsletter — daemon thread, never blocks startup
    try:
        from app.services.newsletter_service import send_newsletter
        send_newsletter()   # skips automatically if already sent today
    except Exception as e:
        print("[Startup] Newsletter warning:", e)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Smart Campus Multi-Agent ERP System"}


# Include modular routers
app.include_router(auth_router)
app.include_router(attendance_router)
app.include_router(syllabus_router)
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(contests_router)
app.include_router(chat_router)
app.include_router(newsletter_router)
app.include_router(hackathons_router)

#added this
app.include_router(chat_logs_router)
app.include_router(exam_router)
