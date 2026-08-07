from fastapi import FastAPI
from pydantic import BaseModel
from app.graph import build_graph
from app.memory.store import add_turn, get_recent_turns

app = FastAPI(title="AgentX Smart Campus Assistant")
compiled_graph = build_graph()

class QueryRequest(BaseModel):
    student_id: str
    query: str

@app.post("/chat")
def chat(req: QueryRequest):
    history = get_recent_turns(req.student_id)

    initial_state = {
        "student_id": req.student_id,
        "user_query": req.query,
        "conversation_history": history,
        "plan": [],
        "current_step_index": 0,
        "agent_outputs": {},
        "final_response": None,
        "error": None,
    }
    result = compiled_graph.invoke(initial_state)

    add_turn(req.student_id, "user", req.query)
    if result.get("final_response"):
        add_turn(req.student_id, "assistant", result["final_response"])

    return {
        "plan": result["plan"],
        "response": result.get("final_response") or result.get("error"),
    }
