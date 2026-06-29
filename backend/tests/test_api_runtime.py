from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import api


def reset_runtime(tmp_path):
    api.DB_PATH = tmp_path / "runtime.db"
    api.RUNTIME_DB_READY = False
    api.JOBS.clear()
    api.AUDIT_EVENTS.clear()
    api.EVIDENCE_RESULTS.clear()
    api.initialize_runtime_state()


def test_audit_events_are_persisted_and_verified(tmp_path):
    reset_runtime(tmp_path)

    event = api.append_audit_event(
        entity_type="System",
        entity_id="test",
        action="Runtime test",
        actor="pytest",
        details="Audit event should survive runtime reload.",
    )

    assert event["previousHash"] == "GENESIS"
    assert api.verify_audit_chain()

    api.AUDIT_EVENTS.clear()
    api.initialize_runtime_state()

    assert len(api.AUDIT_EVENTS) == 1
    assert api.AUDIT_EVENTS[0]["id"] == event["id"]
    assert api.verify_audit_chain()


def test_evidence_validation_flags_contradictions():
    requirements = ["Evidence must contain readable proof for: MFA screenshot."]
    evidence_text = "MFA screenshot not available. This control is pending approval."

    matched, missing, contradicted, snippets = api.validate_evidence(requirements, evidence_text)

    assert matched == []
    assert missing == []
    assert contradicted == requirements
    assert snippets[0]["status"] == "contradicted"


def test_regulator_discovery_extracts_document_links(monkeypatch):
    monkeypatch.setattr(
        api,
        "fetch_text",
        lambda _url: '<html><a href="/docs/circular.pdf">RBI Circular</a><a href="/page.html">Ignore</a></html>',
    )

    links = api.discover_document_links("RBI", "https://example.test/regulator/index.html")

    assert len(links) == 1
    assert links[0]["regulator"] == "RBI"
    assert links[0]["title"] == "RBI Circular"
    assert links[0]["url"] == "https://example.test/docs/circular.pdf"


def test_task_completion_updates_parent_obligation(tmp_path):
    reset_runtime(tmp_path)
    seed_task_tables()

    task = api.mark_task_complete_runtime(1, "EV-1")

    assert task["taskStatus"] == "completed"
    assert task["evidenceSubmitted"] == "EV-1"
    rows = api.list_tasks()
    assert rows[0]["obligationStatus"] == "completed"


def test_close_tasks_for_map_card_matches_action_and_department(tmp_path):
    reset_runtime(tmp_path)
    seed_task_tables()

    card = {
        "id": "MAP-1",
        "summary": "Enable MFA for high-risk transactions",
        "assignedDepartments": ["Digital Banking"],
        "severity": "high",
    }

    completed = api.close_tasks_for_map_card(card, "EV-2")

    assert len(completed) == 1
    assert completed[0]["taskStatus"] == "completed"
    assert completed[0]["evidenceSubmitted"] == "EV-2"


def seed_task_tables():
    with api.connect_runtime_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS obligations (
                id INTEGER PRIMARY KEY,
                document_id INTEGER,
                actor TEXT,
                action TEXT,
                deadline TEXT,
                mandatory INTEGER,
                domain TEXT,
                department TEXT,
                evidence_required TEXT,
                severity TEXT,
                source_section TEXT,
                source_page INTEGER,
                review_flag TEXT,
                status TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                obligation_id INTEGER,
                assigned_department TEXT,
                status TEXT,
                evidence_submitted TEXT,
                submitted_at TEXT
            )
            """
        )
        conn.execute(
            """
            INSERT INTO obligations (
                id, document_id, actor, action, deadline, mandatory, domain, department,
                evidence_required, severity, source_section, source_page, review_flag, status
            )
            VALUES (
                1, 1, 'Bank', 'Enable MFA for high-risk transactions', 'within 30 days',
                1, 'Digital Banking', '["Digital Banking"]', '["MFA screenshot"]',
                'high', 'SEC-1', 1, NULL, 'pending'
            )
            """
        )
        conn.execute(
            """
            INSERT INTO tasks (id, obligation_id, assigned_department, status, evidence_submitted, submitted_at)
            VALUES (1, 1, 'Digital Banking', 'pending', NULL, NULL)
            """
        )
