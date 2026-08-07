import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "memory.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversation_turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS student_facts (
            student_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (student_id, key)
        )
    """)
    conn.commit()
    conn.close()

init_db()

def add_turn(student_id: str, role: str, content: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO conversation_turns (student_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
        (student_id, role, content, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_recent_turns(student_id: str, limit: int = 6) -> list[dict]:
    """Last N turns, oldest first — enough context without bloating the prompt."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT role, content FROM conversation_turns WHERE student_id = ? ORDER BY id DESC LIMIT ?",
        (student_id, limit)
    ).fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

def set_fact(student_id: str, key: str, value: str):
    """Durable facts worth remembering across sessions, e.g. last_registered_event."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO student_facts (student_id, key, value, updated_at) VALUES (?, ?, ?, ?)",
        (student_id, key, value, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_facts(student_id: str) -> dict:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT key, value FROM student_facts WHERE student_id = ?", (student_id,)
    ).fetchall()
    conn.close()
    return {k: v for k, v in rows}
