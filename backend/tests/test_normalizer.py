import pytest
from ingestion.obligations.schema import Obligation
from ingestion.normalize.normalizer import normalize_obligations

def test_normalization_and_deduplication():
    messy_obs_list = [
        # This obligation has typos in departments
        Obligation(
            actor="Bank",
            action="submit the report",
            deadline="within 30 days",
            mandatory=True,
            domain="Compliance",
            department=["Retaill Bankng", "Unknown Department XYZ"], 
            evidence_required=[],
            severity="medium",
            source_section="1.1",
            source_page=1
        ),
        # This is an exact duplicate of the action above, but a more recent source
        Obligation(
            actor="Bank",
            action="submit the report",
            deadline="within 30 days",
            mandatory=True,
            domain="Compliance",
            department=["Retail Banking"], 
            evidence_required=[],
            severity="medium",
            source_section="1.2",
            source_page=2
        ),
        # This is near-identical to the above (different phrasing, same meaning)
        Obligation(
            actor="The Bank",
            action="submits the reports",
            deadline="within 30 days",
            mandatory=True,
            domain="Compliance",
            department=["Compliance"],
            evidence_required=[],
            severity="medium",
            source_section="1.3",
            source_page=3
        ),
        # Distinct obligation with an absolute deadline
        Obligation(
            actor="Auditor",
            action="complete audit",
            deadline="by March 31, 2026",
            mandatory=True,
            domain="Audit",
            department=["Internal Audit"],
            evidence_required=[],
            severity="high",
            source_section="2.0",
            source_page=4
        )
    ]
    
    normalized = normalize_obligations(messy_obs_list)
    
    # 1. Deduplication
    # The first 3 should be collapsed into a single entry from source_section "1.3"
    assert len(normalized) == 2, "Expected exactly 2 unique obligations after deduplication"
    
    bank_obs = next(o for o in normalized if "submit" in o["action"].lower() or "reports" in o["action"].lower())
    assert bank_obs["source_section"] == "1.3", "Did not keep the most recent source"
    assert bank_obs["actor"] == "The Bank"
    
    # 2. Deadline Standardization
    assert bank_obs["deadline"]["type"] == "relative"
    assert bank_obs["deadline"]["value"] == "within 30 days"
    
    auditor_obs = next(o for o in normalized if o["actor"] == "Auditor")
    assert auditor_obs["deadline"]["type"] == "absolute"
    assert auditor_obs["deadline"]["value"] == "by March 31, 2026"

def test_department_fuzzy_matching():
    obs = Obligation(
        actor="IT Team",
        action="update servers",
        deadline="6 hours",
        mandatory=True,
        domain="IT",
        department=["Cyberscurity", "Random Unknown"], # Cyberscurity is a typo
        evidence_required=[],
        severity="low",
        source_section="3.0",
        source_page=5
    )
    
    normalized = normalize_obligations([obs])
    depts = normalized[0]["department"]
    
    assert "Cybersecurity" in depts, "Failed to fuzzy match 'Cyberscurity' to 'Cybersecurity'"
    assert "unmapped: Random Unknown" in depts, "Failed to correctly flag an unmapped department"
