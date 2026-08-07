from langgraph.graph import StateGraph, END
from app.state import GraphState
from app.agents.orchestrator import plan_node, router
from app.agents.academic import academic_node
from app.agents.placement import placement_node
from app.agents.knowledge import knowledge_node
from app.agents.communication import communication_node 

def make_stub(agent_name: str):
    def node(state: GraphState) -> GraphState:
        state["agent_outputs"][agent_name] = f"[stub] {agent_name} handled: {state['plan'][state['current_step_index']]['task']}"
        state["plan"][state["current_step_index"]]["status"] = "done"
        state["current_step_index"] += 1
        return state
    return node

def finalize_node(state: GraphState) -> GraphState:
    parts = []
    for agent, output in state["agent_outputs"].items():
        if isinstance(output, list):
            for o in output:
                parts.append(f"- {agent}: {o}")
        else:
            parts.append(f"- {agent}: {output}")
    state["final_response"] = "Here's what I found:\n" + "\n".join(parts)
    return state


def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("plan", plan_node)
    graph.add_node("academic", academic_node)
    graph.add_node("placement", placement_node)
    graph.add_node("knowledge", knowledge_node)
    graph.add_node("communication", communication_node)
    graph.add_node("finalize", finalize_node)

    graph.set_entry_point("plan")

    routing_map = {
        "academic": "academic", "placement": "placement",
        "knowledge": "knowledge", "communication": "communication",
        "finalize": "finalize", "end": END
    }

    # every node that can hand control back to the router needs this edge —
    # including "plan" itself for the very first step
    for source in ["plan", "academic", "placement", "knowledge", "communication"]:
        graph.add_conditional_edges(source, router, routing_map)

    graph.add_edge("finalize", END)

    return graph.compile()
