"""
Admin AI Agent — uses Groq LLM with LangChain tool-calling.
The LLM decides which tool to call based on the admin's natural language query.
NO keyword matching or if/else logic here.
"""
import os
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from app.tools.attendance_tool import (
    post_attendance_tool,
    get_attendance_summary_tool,
    get_student_list_tool,
    get_job_applications_tool,
    get_jobs_tool,
    register_student_tool,
    get_upcoming_contests_tool,
    post_job_tool,
)

ADMIN_TOOLS = [
    post_attendance_tool,
    get_attendance_summary_tool,
    get_student_list_tool,
    get_job_applications_tool,
    get_jobs_tool,
    register_student_tool,
    get_upcoming_contests_tool,
    post_job_tool,
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
        ).bind_tools(ADMIN_TOOLS)
    return _llm


ADMIN_SYSTEM_PROMPT = """You are the Smart Campus ERP Admin AI Assistant.
You have access to tools for managing campus operations: posting attendance, checking student lists, viewing job applications, etc.

IMPORTANT RULES:
- Always use tools to fetch or post data. Never make up information.
- When posting attendance, extract the EXACT subject name the admin provides — do not substitute or guess.
- Extract roll numbers exactly as stated (format: 1602-24-733-XXX). Do not add or invent roll numbers.
- Today's date context: use the date provided by the admin. If not provided, ask.
- After calling a tool, summarize the result clearly and concisely.
- If the admin's request is unclear (e.g. missing period, section, or roll numbers), ask for the missing info before calling the tool.
"""

def process_admin_query(admin_id: str, query: str) -> dict:
    llm = get_llm()
    messages = [
        SystemMessage(content=ADMIN_SYSTEM_PROMPT),
        HumanMessage(content=query),
    ]

    # Agentic loop: LLM calls tools, we execute them, feed results back
    MAX_STEPS = 5
    try:
        for _ in range(MAX_STEPS):
            response = llm.invoke(messages)
            messages.append(response)

            if not response.tool_calls:
                # LLM is done — no more tool calls
                break

            # Execute each tool call the LLM requested
            for tc in response.tool_calls:
                tool_name = tc["name"]
                tool_args = tc["args"]

                # Find and invoke the matching tool
                matched = next((t for t in ADMIN_TOOLS if t.name == tool_name), None)
                if matched:
                    # Inject admin_id for tools that need it
                    if "posted_by" in matched.args_schema.schema().get("properties", {}):
                        tool_args.setdefault("posted_by", admin_id)
                    tool_result = matched.invoke(tool_args)
                else:
                    tool_result = f"Unknown tool: {tool_name}"

                messages.append(
                    ToolMessage(content=str(tool_result), tool_call_id=tc["id"])
                )
    except Exception as e:
        if "rate limit" in str(e).lower() or "429" in str(e):
            return {"action": "agent_response", "reply": "⚠️ Groq AI API daily rate limit reached (429). Please wait a few minutes or switch API keys in .env."}
        return {"action": "agent_response", "reply": f"Admin Assistant Error: {e}"}

    final_text = response.content if response.content else "Done."
    return {"action": "agent_response", "reply": final_text}
