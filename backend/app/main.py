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
