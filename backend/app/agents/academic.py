from langchain_groq import ChatGroq
from app.config import REASONING_MODEL, GROQ_API_KEY
from app.state import GraphState
from app.tools.mock_data import get_student

MIN_ATTENDANCE_FOR_EXAM = 75

llm = ChatGroq(model=REASONING_MODEL, api_key=GROQ_API_KEY, temperature=0)

def calculate_attendance_eligibility(student: dict) -> dict:
    """Real deterministic logic — not LLM-guessed numbers."""
    attendance = student.get("attendance", {})
    results = {}
    for course, pct in attendance.items():
        results[course] = {
            "attendance": pct,
            "exam_eligible": pct >= MIN_ATTENDANCE_FOR_EXAM,
        }
    return results

def academic_node(state: GraphState) -> GraphState:
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]
    student = get_student(state["student_id"])

    if not student:
        state["agent_outputs"]["academic"] = f"No student record found for ID '{state['student_id']}'."
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    eligibility = calculate_attendance_eligibility(student)

    # let the LLM turn the computed facts into a natural-language answer,
    # but it never invents the numbers themselves
    summary_prompt = f"""Student: {student['name']}, Year {student['year']}, {student['branch']}
Task: {task}
Computed attendance/eligibility data: {eligibility}
Timetable: {student.get('timetable', {})}

Answer the task briefly using ONLY the computed data above. Do not invent numbers."""

    response = llm.invoke(summary_prompt)

    state["agent_outputs"].setdefault("academic",[]).append(response.content)
    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state
