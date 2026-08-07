from typing import TypedDict, List, Dict, Any, Optional

class PlanStep(TypedDict):
    agent: str          # which agent handles this step
    task: str            # natural-language description of the sub-task
    status: str            # "pending" | "in_progress" | "done" | "failed"

class GraphState(TypedDict):
    student_id: str
    user_query: str
    conversation_history: List[Dict[str, str]]   # role/content pairs, pulled from memory
    plan: List[PlanStep]
    current_step_index: int
    agent_outputs: Dict[str, Any]     # keyed by agent name
    final_response: Optional[str]
    error: Optional[str]
