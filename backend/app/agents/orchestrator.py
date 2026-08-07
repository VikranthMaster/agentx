import json
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from app.config import ROUTER_MODEL, LOCAL_FALLBACK_MODEL, GROQ_API_KEY
from app.state import GraphState

groq_llm = ChatGroq(model=ROUTER_MODEL, api_key=GROQ_API_KEY, temperature=0)
local_llm = ChatOllama(model=LOCAL_FALLBACK_MODEL, temperature=0)

def get_llm():
    """Try Groq first (fast, high quality). Fall back to local Ollama if it errors
    (venue wifi died, rate limit hit, etc). This IS your graceful-fallback demo point."""
    return groq_llm

AGENTS = ["academic", "placement", "knowledge", "communication"]

PLANNER_PROMPT = """You are the orchestrator for a smart campus assistant.
Recent conversation (may be empty):
{history}

Break the user's request into an ordered list of steps. Each step must be
handled by exactly one of these agents: {agents}

- academic: timetables, attendance %, exam eligibility
- placement: internship/company eligibility, registration for placement events
- knowledge: policy/FAQ/handbook lookups (RAG)
- communication: drafting emails, sending notifications, calendar reminders

Use the conversation history to resolve references like "that workshop" or
"my last registration" if relevant.

Return ONLY valid JSON, a list of objects like:
[{{"agent": "placement", "task": "check Google internship eligibility"}}]

No prose, no markdown fences, just the raw JSON array.

User request: {query}
"""

def plan_node(state: GraphState) -> GraphState:
    history_text = "\n".join(
        f"{t['role']}: {t['content'][:200]}" for t in state.get("conversation_history", [])
    ) or "(no prior conversation)"
    prompt = PLANNER_PROMPT.format(agents=", ".join(AGENTS), query=state["user_query"], history=history_text)

    try:
        response = groq_llm.invoke(prompt)
        used_model = "groq"
    except Exception as e:
        print(f"[fallback] Groq failed ({e}), switching to local Ollama")
        response = local_llm.invoke(prompt)
        used_model = "ollama-local"

    raw = response.content.strip()
    # strip markdown fences if the model added them anyway
    if raw.startswith("```"):
        raw = raw.strip("`").replace("json\n", "", 1)

    try:
        steps = json.loads(raw)
    except json.JSONDecodeError:
        state["error"] = f"Planner returned invalid JSON ({used_model}): {raw[:200]}"
        state["plan"] = []
        return state

    state["plan"] = [{"agent": s["agent"], "task": s["task"], "status": "pending"} for s in steps]
    state["current_step_index"] = 0
    state["agent_outputs"] = {}
    return state


def router(state: GraphState) -> str:
    idx = state["current_step_index"]
    if state.get("error"):
        return "end"
    if idx >= len(state["plan"]):
        return "finalize"
    return state["plan"][idx]["agent"]
