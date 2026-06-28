import pytest
from ingestion.graph.builder import build_graph, query_by_department, query_by_domain, export_json

def test_graph_builder_and_queries():
    fake_obligations = [
        {
            "domain": "Compliance",
            "department": ["Retail Banking", "Legal"],
            "action": "submit annual report",
            "evidence_required": ["annual report document"]
        },
        {
            "domain": "IT Security",
            "department": ["Cybersecurity"],
            "action": "rotate passwords",
            "evidence_required": ["password log"]
        },
        {
            "domain": "Compliance",
            "department": ["Retail Banking"],
            "action": "conduct KYC refresh",
            "evidence_required": []
        }
    ]
    
    # Build graph
    graph = build_graph(fake_obligations, "RBI_Circular_2026_Q2")
    
    # 1. Test query_by_department
    retail_tasks = query_by_department(graph, "Retail Banking")
    assert len(retail_tasks) == 2
    assert "submit annual report" in retail_tasks
    assert "conduct KYC refresh" in retail_tasks
    
    cyber_tasks = query_by_department(graph, "Cybersecurity")
    assert len(cyber_tasks) == 1
    assert "rotate passwords" in cyber_tasks
    
    # 2. Test query_by_domain
    compliance_depts = query_by_domain(graph, "Compliance")
    assert len(compliance_depts) == 2
    assert "Retail Banking" in compliance_depts
    assert "Legal" in compliance_depts
    
    it_depts = query_by_domain(graph, "IT Security")
    assert len(it_depts) == 1
    assert "Cybersecurity" in it_depts
    
    # 3. Test export_json
    data = export_json(graph)
    assert "nodes" in data
    assert "links" in data
    # Ensure our structural nodes are actually represented
    node_ids = [n["id"] for n in data["nodes"]]
    assert "Circular:RBI_Circular_2026_Q2" in node_ids
    assert "Task:rotate passwords" in node_ids
    assert "Evidence:annual report document" in node_ids
