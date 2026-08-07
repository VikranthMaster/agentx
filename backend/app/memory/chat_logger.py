"""
Chat log persistence — records every chat turn (student + admin) so
conversations can be reviewed later. Separate table/file from
app/memory/store.py (which is used for short-term LLM recall) to avoid
touching existing logic.
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "chat_logs.db"


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_id TEXT NOT NULL,          -- roll number / admin id
            actor_type TEXT NOT NULL,        -- 'student' | 'admin'
            session_id TEXT,
            role TEXT NOT NULL,              -- 'user' | 'assistant'
            content TEXT NOT NULL,
            tool_calls TEXT,                 -- JSON, nullable
            trace TEXT,                      -- JSON "show thinking" trace, nullable
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_logs_actor ON chat_logs(actor_id, created_at)")
    conn.commit()
    conn.close()


init_db()


def log_message(actor_id: str, actor_type: str, role: str, content: str,
                 tool_calls: list | None = None, trace: list | None = None,
                 session_id: str | None = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO chat_logs (actor_id, actor_type, session_id, role, content, tool_calls, trace, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            actor_id, actor_type, session_id or datetime.now().strftime("%Y-%m-%d"),
            role, content,
            json.dumps(tool_calls) if tool_calls else None,
            json.dumps(trace) if trace else None,
            datetime.now().isoformat(),
        ),
    )
    conn.commit()
    log_id = cur.lastrowid
    conn.close()
    return log_id


def get_logs_for_actor(actor_id: str, limit: int = 200) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM chat_logs WHERE actor_id = ? ORDER BY id ASC LIMIT ?",
        (actor_id, limit),
    ).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


def get_all_logs(actor_type: str | None = None, limit: int = 500) -> list[dict]:
    conn = _get_conn()
    if actor_type:
        rows = conn.execute(
            "SELECT * FROM chat_logs WHERE actor_type = ? ORDER BY id DESC LIMIT ?",
            (actor_type, limit),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM chat_logs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


def _rows_to_dicts(rows) -> list[dict]:
    out = []
    for r in rows:
        d = dict(r)
        for key in ("tool_calls", "trace"):
            if d.get(key):
                try:
                    d[key] = json.loads(d[key])
                except Exception:
                    pass
        out.append(d)
    return out