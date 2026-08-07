"""
Student AI Agent — uses Groq LLM with LangChain tool-calling.
The student's roll number is injected from session context so the LLM
never needs to guess who is asking.
"""
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from app.tools.attendance_tool import (
    get_my_attendance_tool,
    get_jobs_tool,
    get_syllabus_tool,
    get_my_resume_tool,
    apply_for_job_tool,
    get_upcoming_contests_tool,
    parse_resume_tool,
)

STUDENT_TOOLS = [
    get_my_attendance_tool,
    get_jobs_tool,
    get_syllabus_tool,
    get_my_resume_tool,
    apply_for_job_tool,
    get_upcoming_contests_tool,
    parse_resume_tool,
]

_llm = None

def get_llm():
    global _llm
    if _llm is None:
        from app.config import GROQ_API_KEY
        _llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model="llama-3.3-70b-versatile",
            temperature=0,
        ).bind_tools(STUDENT_TOOLS)
    return _llm


def get_student_system_prompt(student_id: str, student_name: str) -> str:
    return f"""You are the Smart Campus Student AI Assistant for {student_name} (Roll: {student_id}).

You have access to tools for checking attendance, applying for jobs, parsing resumes, viewing syllabus, and tracking contests.

IMPORTANT RULES:
1. ROLL NUMBER: The student's roll number is {student_id}. Always pass student_id="{student_id}" when calling tools.
2. CAMPUS TOOLS vs GENERAL QUESTIONS:
   - If the student asks about campus data (attendance, jobs, applying for a job, syllabus, contests, resume profile), call the matching tool.
   - If the student asks a GENERAL QUESTION (tech concepts, coding questions, general advice, general knowledge), answer directly and comprehensively using your AI knowledge without calling tools.
3. JOB APPLICATIONS: When the student asks to apply for a job (e.g. "apply for job 1" or "apply to Service Now"), call apply_for_job_tool with student_id="{student_id}" and job_id.
4. ATTENDANCE: When asked about attendance, call get_my_attendance_tool with student_id="{student_id}".
"""


def process_student_query(student_id: str, query: str, student_name: str = "") -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=get_student_system_prompt(student_id, student_name or student_id)),
        HumanMessage(content=query),
    ]

    tailored_file = None
    MAX_STEPS = 5
    for _ in range(MAX_STEPS):
        response = llm.invoke(messages)
        messages.append(response)

        if not response.tool_calls:
            break

        for tc in response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc["args"]

            matched = next((t for t in STUDENT_TOOLS if t.name == tool_name), None)
            if matched:
                # Ensure student_id is always correctly set
                if "student_id" in matched.args_schema.schema().get("properties", {}):
                    tool_args["student_id"] = student_id
                
                tool_result = matched.invoke(tool_args)

                # Scan tool result for generated tailored resume HTML filename
                tool_result_str = str(tool_result)
                if "tailored_" in tool_result_str:
                    m = re.search(r"(tailored_[\w.-]+\.html)", tool_result_str)
                    if m:
                        tailored_file = m.group(1)
            else:
                tool_result = f"Unknown tool: {tool_name}"

            messages.append(
                ToolMessage(content=str(tool_result), tool_call_id=tc["id"])
            )

    final_text = response.content if response.content else "Done."
    return {"action": "agent_response", "reply": final_text, "tailored_file": tailored_file}
