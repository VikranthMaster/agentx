from langchain_groq import ChatGroq
from app.config import REASONING_MODEL, GROQ_API_KEY
from app.state import GraphState
from app.tools.vectorstore import get_vectorstore

llm = ChatGroq(model=REASONING_MODEL, api_key=GROQ_API_KEY, temperature=0)

def knowledge_node(state: GraphState) -> GraphState:
    idx = state["current_step_index"]
    task = state["plan"][idx]["task"]

    vectorstore = get_vectorstore()
    results = vectorstore.similarity_search(task, k=3)
    context = "\n\n".join([r.page_content for r in results])

    prompt = f"""Answer the task using ONLY the context below. If the context
doesn't contain the answer, say so explicitly — do not make anything up.

Context:
{context}

Task: {task}
"""
    response = llm.invoke(prompt)

    state["agent_outputs"].setdefault("knowledge", []).append(response.content)
    state["plan"][idx]["status"] = "done"
    state["current_step_index"] += 1
    return state
