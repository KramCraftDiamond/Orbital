import networkx as nx
from typing import List, Dict, Any

def build_graph(obligations: List[Dict[str, Any]], source_doc_name: str) -> nx.DiGraph:
    """
    Builds a directed graph mapping the hierarchy:
    Circular -> Domain -> Department -> Task -> Evidence
    """
    G = nx.DiGraph()
    
    # Root Document Node
    doc_node = f"Circular:{source_doc_name}"
    G.add_node(doc_node, type="Circular", label=source_doc_name)
    
    for obs in obligations:
        # Support both Pydantic models and raw dicts for flexibility
        if hasattr(obs, 'model_dump'):
            obs = obs.model_dump()
            
        domain = obs.get("domain", "Unknown Domain")
        action = obs.get("action", "Unknown Task")
        # Support both new 'departments' key and old 'department' key
        departments = obs.get("departments") or obs.get("department", [])
        evidences = obs.get("evidence_required", [])
        
        # We prefix node IDs to prevent cross-contamination 
        # (e.g. if a Domain and a Department share the same name like "Compliance")
        domain_node = f"Domain:{domain}"
        task_node = f"Task:{action}"
        
        G.add_node(domain_node, type="Domain", label=domain)
        G.add_edge(doc_node, domain_node)
        
        # Attach full obligation data to the task node for downstream retrieval
        G.add_node(task_node, type="Task", label=action, details=obs)
        
        for dept in departments:
            dept_node = f"Dept:{dept}"
            G.add_node(dept_node, type="Department", label=dept)
            G.add_edge(domain_node, dept_node)
            G.add_edge(dept_node, task_node)
            
        for ev in evidences:
            ev_node = f"Evidence:{ev}"
            G.add_node(ev_node, type="Evidence", label=ev)
            G.add_edge(task_node, ev_node)
            
    return G

def export_json(graph: nx.DiGraph) -> dict:
    """
    Exports the graph to a JSON-serializable node-link dictionary,
    which is standard for D3.js, Sigma.js, or other graph visualizers.
    """
    data = nx.node_link_data(graph)
    # NetworkX 3.x uses "edges" by default, but standard D3 usually expects "links"
    if "edges" in data and "links" not in data:
        data["links"] = data.pop("edges")
    return data

def query_by_department(graph: nx.DiGraph, dept_name: str) -> List[str]:
    """
    Returns a list of tasks assigned to a specific department.
    """
    node_id = f"Dept:{dept_name}"
    if node_id not in graph:
        return []
    
    tasks = []
    # Tasks are the successors of a Department in our chain
    for successor in graph.successors(node_id):
        if graph.nodes[successor].get("type") == "Task":
            tasks.append(graph.nodes[successor].get("label", successor))
            
    return tasks

def query_by_domain(graph: nx.DiGraph, domain_name: str) -> List[str]:
    """
    Returns a list of affected departments under a specific domain.
    """
    node_id = f"Domain:{domain_name}"
    if node_id not in graph:
        return []
        
    depts = []
    # Departments are the successors of a Domain in our chain
    for successor in graph.successors(node_id):
        if graph.nodes[successor].get("type") == "Department":
            depts.append(graph.nodes[successor].get("label", successor))
            
    return depts
