from langchain_groq import ChatGroq
from app.config import REASONING_MODEL, GROQ_API_KEY
from app.state import GraphState
from app.tools.mock_data import get_student, load_placements, save_placements

llm = ChatGroq(model=REASONING_MODEL, api_key=GROQ_API_KEY, temperature=0)

def check_eligibility(student: dict, company: dict) -> dict:
    """Deterministic eligibility check — real logic, not LLM guessing."""
    reasons = []
    eligible = True

    if student["cgpa"] < company["min_cgpa"]:
        eligible = False
        reasons.append(f"CGPA {student['cgpa']} below required {company['min_cgpa']}")
    if student["branch"] not in company["eligible_branches"]:
        eligible = False
        reasons.append(f"Branch {student['branch']} not eligible")
    if student["year"] < company["min_year"]:
        eligible = False
        reasons.append(f"Year {student['year']} below required {company['min_year']}")
    if student.get("backlogs", 0) > company["backlogs_allowed"]:
        eligible = False
        reasons.append(f"Backlogs exceed allowed {company['backlogs_allowed']}")

    return {"eligible": eligible, "reasons": reasons}

def register_for_event(student_id: str, company_name: str) -> str:
    data = load_placements()
    event = next((e for e in data["events"] if e["company"].lower() == company_name.lower()), None)
    if not event:
        return f"No workshop found for {company_name}."
    if student_id not in event["registered_students"]:
        event["registered_students"].append(student_id)
        save_placements(data)
    return f"Registered for {event['name']} on {event['date']} at {event['time']}."

def placement_node(state: GraphState) -> GraphState:
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]
    student = get_student(state["student_id"])
    data = load_placements()

    if not student:
        state["agent_outputs"].setdefault("placement", []).append(f"No student record for '{state['student_id']}'.")
        state["plan"][idx]["status"] = "failed"
        state["current_step_index"] += 1
        return state

    # find the company mentioned in the task (simple keyword match — fine for hackathon scope)
    company = next((c for c in data["companies"] if c["name"].lower() in task.lower()), None)

    if company:
        result = check_eligibility(student, company)
        prompt = f"""Student: {student['name']}, CGPA {student['cgpa']}, Year {student['year']}, Branch {student['branch']}
Task: {task}
Computed eligibility result: {result}

Answer in ONE plain sentence using ONLY the computed result above. Do not print the raw dictionary or JSON — write it as natural language. Do not invent criteria."""
        response = llm.invoke(prompt)
        output = response.content

        # auto-register if eligible and task implies registration
        if result["eligible"] and "register" in task.lower():
            output += " " + register_for_event(state["student_id"], company["name"])
    else:
        output = f"Could not match a known company in task: '{task}'"

    state["agent_outputs"].setdefault("placement", []).append(output)
    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state
