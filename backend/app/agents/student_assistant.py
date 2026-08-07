"""
Student AI Agent — uses Groq LLM with LangChain tool-calling.
The student's roll number is injected from session context so the LLM
never needs to guess who is asking.
"""
import re
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage

from app.tools.attendance_tool import (
    get_my_attendance_tool,
    get_jobs_tool,
    get_syllabus_tool,
    get_my_resume_tool,
    apply_for_job_tool,
    confirm_application_tool,
    get_my_applications_tool,
    get_upcoming_contests_tool,
    parse_resume_tool,
)
from app.tools.placement_tool import check_job_fit_tool
from app.tools.roadmap_tool import generate_roadmap_tool
from app.tools.hackathon_tool import (
    get_hackathons_tool,
    register_for_hackathon_tool,
    confirm_hackathon_registration_tool,
    ideate_hackathon_tool,
)
from app.memory.long_term import get_long_term_context

STUDENT_TOOLS = [
    get_my_attendance_tool,
    get_jobs_tool,
    get_syllabus_tool,
    get_my_resume_tool,
    apply_for_job_tool,
    confirm_application_tool,
    get_my_applications_tool,
    get_upcoming_contests_tool,
    parse_resume_tool,
    # New tools
    check_job_fit_tool,
    generate_roadmap_tool,
    get_hackathons_tool,
    register_for_hackathon_tool,
    confirm_hackathon_registration_tool,
    ideate_hackathon_tool,
]

_llm = None


def _reset_llm():
    """Force recreation of the LLM instance (used after tool list changes)."""
    global _llm
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
    ltm = get_long_term_context(student_id)
    return f"""You are the Smart Campus Student AI Assistant for {student_name} (Roll: {student_id}).

You have access to tools for checking attendance, applying for jobs, parsing resumes, viewing syllabus, tracking contests, checking job fit, generating learning roadmaps, and exploring hackathons.

Long-term memory about this student:
{ltm}

IMPORTANT RULES:
1. ROLL NUMBER: The student's roll number is {student_id}. Always pass student_id="{student_id}" when calling tools.
2. CAMPUS TOOLS vs GENERAL QUESTIONS:
   - If the student asks about campus data (attendance, jobs, syllabus, contests, resume profile, hackathons), call the matching tool.
   - If the student asks a GENERAL QUESTION (tech concepts, coding questions, general advice, general knowledge), answer directly using your AI knowledge without calling tools.
3. JOB APPLICATIONS — TWO STEPS, NEVER SKIP THE FIRST:
   a. When the student asks to apply for a job, call apply_for_job_tool. This ONLY generates a tailored resume preview — it does not submit anything.
   b. Only call confirm_application_tool after the student explicitly confirms in a follow-up message (e.g. "yes", "confirm", "submit it"). Never call confirm_application_tool in the same turn as apply_for_job_tool.
4. APPLICATION STATUS: If asked "what's the status of my application(s)" or "show my applications" or similar, call get_my_applications_tool.
5. ATTENDANCE: When asked about attendance, call get_my_attendance_tool with student_id="{student_id}".
6. JOB FIT: If a student asks "should I apply for", "am I a fit for", "do I qualify for", or mentions a specific job before applying, ALWAYS call check_job_fit_tool first. If the fit_score returned is below 50, ask the student if they'd like a personalized roadmap to close the skill gap before applying — offer to call generate_roadmap_tool.
7. HACKATHONS: If a student mentions a hackathon by name, asks about upcoming hackathons, or asks "should I participate in X", first call get_hackathons_tool to list active ones. If they seem undecided, offer to help them decide by weighing their skills against the tech_focus. Offer ideate_hackathon_tool once they show interest. Only call register_for_hackathon_tool after they explicitly confirm they want to register — it will stage the action for confirmation, never register silently.
8. ROADMAP: If a student asks "how do I learn X", "give me a study plan for X", or "what should I study for Y role", call generate_roadmap_tool. It automatically considers their academic year, completed subjects, and any job-fit gaps on file.
"""


def process_student_query(student_id: str, query: str, student_name: str = "") -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=get_student_system_prompt(student_id, student_name or student_id)),
        HumanMessage(content=query),
    ]

    trace = [{"step": "planning", "model": "groq/llama-3.3-70b-versatile",
              "text": "Reading student query, deciding which tools are needed."}]

    tailored_file = None
    MAX_STEPS = 8  # bumped up since we have more tools now

    for _ in range(MAX_STEPS):
        try:
            response = llm.invoke(messages)
        except Exception as e:
            if "rate limit" in str(e).lower() or "429" in str(e):
                from app.config import LOCAL_FALLBACK_MODEL
                trace.append({"step": "fallback",
                               "text": f"Groq rate limit (429) hit. Switching to local {LOCAL_FALLBACK_MODEL}."})
                llm = ChatOllama(model=LOCAL_FALLBACK_MODEL, temperature=0).bind_tools(STUDENT_TOOLS)
                try:
                    response = llm.invoke(messages)
                except Exception as fallback_e:
                    trace.append({"step": "error", "text": f"Local fallback failed: {fallback_e}"})
                    return {"action": "agent_response", "reply": f"AI Assistant Error (Fallback failed): {fallback_e}",
                            "tailored_file": tailored_file, "trace": trace}
            else:
                trace.append({"step": "error", "text": str(e)})
                return {"action": "agent_response", "reply": f"AI Assistant Error: {e}",
                        "tailored_file": tailored_file, "trace": trace}

        messages.append(response)

        # Break if LLM is done calling tools
        if not hasattr(response, 'tool_calls') or not response.tool_calls:
            break

        for tc in response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc.get("args", {})
            trace.append({"step": "tool_call", "tool": tool_name, "args": tool_args})

            matched = next((t for t in STUDENT_TOOLS if t.name == tool_name), None)
            if matched:
                if "student_id" in matched.args_schema.schema().get("properties", {}):
                    tool_args["student_id"] = student_id

                try:
                    tool_result = matched.invoke(tool_args)
                    tool_result_str = str(tool_result)
                    if "tailored_" in tool_result_str:
                        m = re.search(r"(tailored_[\w.-]+\.html)", tool_result_str)
                        if m:
                            tailored_file = m.group(1)
                except Exception as te:
                    tool_result_str = f"Tool execution failed: {te}"
            else:
                tool_result_str = f"Unknown tool: {tool_name}"

            trace.append({"step": "tool_result", "tool": tool_name, "result": tool_result_str[:400]})
            messages.append(
                ToolMessage(content=tool_result_str, tool_call_id=tc.get("id", "local_id"))
            )

    last_tool_output = None
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage) and msg.content:
            last_tool_output = msg.content
            break

    final_text = (response.content
                  if (hasattr(response, 'content') and response.content
                      and response.content.strip() not in ("", "Done."))
                  else (last_tool_output or "Done."))
    trace.append({"step": "final", "text": final_text})

    return {
        "action": "agent_response",
        "reply": final_text,
        "tailored_file": tailored_file,
        "trace": trace,
    }