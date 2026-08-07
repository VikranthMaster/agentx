"""
Long-term memory — compresses a student's chat history into durable facts
stored in the `long_term_memory` table. These facts are injected into every
agent prompt so accumulated context survives across sessions.
"""
import json
from datetime import datetime

from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.database import get_db_connection
from app.memory.chat_logger import get_logs_for_actor

# ── LLM setup (Groq primary, Ollama 429 fallback) ─────────────────────────────

def _get_llm():
    from app.config import GROQ_API_KEY
    return ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)


def _get_fallback_llm():
    from app.config import LOCAL_FALLBACK_MODEL
    return ChatOllama(model=LOCAL_FALLBACK_MODEL, temperature=0)


def _invoke_llm(prompt: str) -> str:
    try:
        return _get_llm().invoke(prompt).content
    except Exception as e:
        if "429" in str(e) or "rate limit" in str(e).lower():
            try:
                return _get_fallback_llm().invoke(prompt).content
            except Exception as fe:
                raise RuntimeError(f"Both Groq and Ollama failed: {fe}")
        raise


# ── Summarization prompt ───────────────────────────────────────────────────────

SUMMARY_PROMPT = """You are compressing a student's chat history into durable memory facts.
Only extract things that will still be true/useful weeks from now — NOT one-off answers or greetings.
Categories (use exactly these strings):
  preference     — learning preferences, communication style, tool preferences
  skill_gap      — skills they explicitly mentioned lacking or struggling with
  goal           — stated career goals, target companies, domains of interest
  placement_history — jobs applied to, outcomes, interview feedback

Transcript:
{transcript}

Return ONLY a valid JSON list like:
[{{"category": "goal", "content": "wants to break into ML engineering roles at product companies"}}]
If nothing durable is present, return [].
No prose, no markdown fences — only the raw JSON array."""


# ── Core functions ─────────────────────────────────────────────────────────────

def summarize_session(student_id: str, session_id: str) -> None:
    """
    Compress chat logs for a session into durable facts and insert them into
    `long_term_memory`. Called in a background thread from the chat route.
    Silently skips if there's not enough signal (< 4 turns).
    """
    logs = [
        l for l in get_logs_for_actor(student_id)
        if l.get("session_id") == session_id
    ]
    if len(logs) < 4:
        return

    transcript = "\n".join(
        f"{l['role']}: {l['content'][:300]}" for l in logs
    )

    try:
        raw = _invoke_llm(SUMMARY_PROMPT.format(transcript=transcript)).strip()
    except Exception as e:
        print(f"[LTM] LLM summarization failed for {student_id}/{session_id}: {e}")
        return

    # Strip markdown fences if model added them anyway
    if raw.startswith("```"):
        raw = raw.strip("`").replace("json\n", "", 1).strip()

    try:
        facts = json.loads(raw)
        if not isinstance(facts, list):
            return
    except json.JSONDecodeError:
        return

    conn = get_db_connection()
    now = datetime.now().isoformat()
    inserted = 0
    for f in facts:
        cat = f.get("category", "").strip()
        content = f.get("content", "").strip()
        if not cat or not content:
            continue

        # Simple dedup: skip if a very similar fact already exists
        existing = conn.execute(
            "SELECT content FROM long_term_memory WHERE student_id=? AND category=?",
            (student_id, cat)
        ).fetchall()
        if any(content.lower() in row["content"].lower() or
               row["content"].lower() in content.lower()
               for row in existing):
            continue

        conn.execute(
            """INSERT INTO long_term_memory
               (student_id, category, content, source_session_id, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (student_id, cat, content, session_id, now)
        )
        inserted += 1

    conn.commit()
    conn.close()
    if inserted:
        print(f"[LTM] Stored {inserted} new fact(s) for student {student_id}")


def get_long_term_context(student_id: str, limit_per_category: int = 3) -> str:
    """
    Return a bullet-point string of the student's most recent durable facts,
    ready to inject into any agent system prompt.
    Returns "(no long-term memory yet)" if the table is empty for this student.
    """
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT category, content FROM long_term_memory
           WHERE student_id=? ORDER BY created_at DESC LIMIT 30""",
        (student_id,)
    ).fetchall()
    conn.close()

    by_cat: dict[str, list[str]] = {}
    for r in rows:
        cat, content = r["category"], r["content"]
        by_cat.setdefault(cat, [])
        if len(by_cat[cat]) < limit_per_category:
            by_cat[cat].append(content)

    if not by_cat:
        return "(no long-term memory yet)"

    return "\n".join(
        f"- [{cat}]: {'; '.join(items)}"
        for cat, items in by_cat.items()
    )
