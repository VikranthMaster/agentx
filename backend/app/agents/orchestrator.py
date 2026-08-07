import json
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from app.config import GROQ_API_KEY, LOCAL_FALLBACK_MODEL
from app.state import GraphState
from app.memory.long_term import get_long_term_context

groq_llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_API_KEY, temperature=0)
local_llm = ChatOllama(model=LOCAL_FALLBACK_MODEL, temperature=0)

def get_llm():
    """Try Groq first (fast, high quality). Fall back to local Ollama on 429."""
    return groq_llm

AGENTS = [
    "academic",
    "placement",
    "placement_fit",
    "knowledge",
    "communication",
    "roadmap",
]

PLANNER_PROMPT = """You are the orchestrator for a smart campus multi-agent assistant.
Recent conversation (may be empty):
{history}

Long-term memory about this student:
{ltm_context}

Break the user's request into an ordered list of steps. Each step must be
handled by exactly one of these agents: {agents}

- academic: timetables, attendance %, exam eligibility
- placement: internship/company eligibility, registration for placement events (uses mock data)
- placement_fit: analyse whether a student is a fit for a specific real job posting (uses live DB);
  writes fit_score and missing_skills to shared state for the roadmap agent to consume
- knowledge: policy/FAQ/handbook lookups (RAG)
- communication: drafting emails, sending notifications, calendar reminders;
  if roadmap_structured is in shared state, can email it directly to the student
- roadmap: generate a personalised learning roadmap for a topic or to close skill gaps
  identified by placement_fit; reads placement_structured from shared state automatically

When the user asks "am I a fit for job X AND give me a roadmap AND email it":
  → [placement_fit, roadmap, communication]  (in that order — each reads the prior agent's output)

Use the conversation history and long-term memory to resolve references.

Return ONLY valid JSON, a list of objects like:
[{{"agent": "placement_fit", "task": "check fit for Google SDE internship job #3"}}]

No prose, no markdown fences, just the raw JSON array.

User request: {query}
"""


def plan_node(state: GraphState) -> GraphState:
    history_text = "\n".join(
        f"{t['role']}: {t['content'][:200]}" for t in state.get("conversation_history", [])
    ) or "(no prior conversation)"

    ltm_context = get_long_term_context(state["student_id"])

    prompt = PLANNER_PROMPT.format(
        agents=", ".join(AGENTS),
        query=state["user_query"],
        history=history_text,
        ltm_context=ltm_context,
    )

    used_model = "groq"
    try:
        response = groq_llm.invoke(prompt)
    except Exception as e:
        if "429" in str(e) or "rate limit" in str(e).lower():
            print(f"[Orchestrator] Groq 429, switching to Ollama: {e}")
            response = local_llm.invoke(prompt)
            used_model = "ollama-local"
        else:
            print(f"[Orchestrator] Groq failed ({e}), switching to local Ollama")
            response = local_llm.invoke(prompt)
            used_model = "ollama-local"

    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.strip("`").replace("json\n", "", 1).strip()

    try:
        steps = json.loads(raw)
    except json.JSONDecodeError:
        state["error"] = f"Planner returned invalid JSON ({used_model}): {raw[:200]}"
        state["plan"] = []
        return state

    state["plan"] = [{"agent": s["agent"], "task": s["task"], "status": "pending"} for s in steps]
    state["current_step_index"] = 0
    state["agent_outputs"] = {}
    state["step_timestamps"] = {}
    return state


def router(state: GraphState) -> str:
    idx = state["current_step_index"]
    if state.get("error"):
        return "end"
    if idx >= len(state["plan"]):
        return "finalize"
    agent = state["plan"][idx]["agent"]
    # Validate agent is known; if not, skip to next
    known = set(AGENTS) | {"finalize", "end"}
    if agent not in known:
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return router(state)
    return agent
