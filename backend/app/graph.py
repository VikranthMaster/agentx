from datetime import datetime
from langgraph.graph import StateGraph, END
from app.state import GraphState
from app.agents.orchestrator import plan_node, router
from app.agents.academic import academic_node
from app.agents.placement import placement_node, placement_fit_node
from app.agents.knowledge import knowledge_node
from app.agents.communication import communication_node
from app.agents.roadmap import roadmap_node


def finalize_node(state: GraphState) -> GraphState:
    """
    Collects all agent outputs into a single response string.
    Also packages a structured trace array (plan + timestamps) for the
    /api/chat-logs/{actor_id}/latest-trace endpoint.
    """
    parts = []
    for agent, output in state["agent_outputs"].items():
        # Skip internal structured channels — they're for agent-to-agent, not user display
        if agent.endswith("_structured"):
            continue
        if isinstance(output, list):
            for o in output:
                parts.append(f"- **{agent}**: {o}")
        else:
            parts.append(f"- **{agent}**: {output}")

    state["final_response"] = "Here's what I found:\n" + "\n".join(parts)

    # Build graph-level trace for demo visibility
    timestamps = state.get("step_timestamps", {})
    graph_trace = []
    for i, step in enumerate(state.get("plan", [])):
        ts_key = f"{step['agent']}_{i}"
        graph_trace.append({
            "step": i + 1,
            "agent": step["agent"],
            "task": step["task"],
            "status": step["status"],
            "timestamp": timestamps.get(ts_key, datetime.now().isoformat()),
            # Include any structured output this agent wrote for downstream consumption
            "structured_output": state["agent_outputs"].get(f"{step['agent']}_structured"),
        })

    state["agent_outputs"]["_graph_trace"] = graph_trace
    return state


def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("plan", plan_node)
    graph.add_node("academic", academic_node)
    graph.add_node("placement", placement_node)
    graph.add_node("placement_fit", placement_fit_node)   # new
    graph.add_node("knowledge", knowledge_node)
    graph.add_node("communication", communication_node)
    graph.add_node("roadmap", roadmap_node)               # new
    graph.add_node("finalize", finalize_node)

    graph.set_entry_point("plan")

    routing_map = {
        "academic": "academic",
        "placement": "placement",
        "placement_fit": "placement_fit",
        "knowledge": "knowledge",
        "communication": "communication",
        "roadmap": "roadmap",
        "finalize": "finalize",
        "end": END,
    }

    # Every node that can hand control back to the router needs this conditional edge
    for source in [
        "plan", "academic", "placement", "placement_fit",
        "knowledge", "communication", "roadmap",
    ]:
        graph.add_conditional_edges(source, router, routing_map)

    graph.add_edge("finalize", END)

    return graph.compile()
