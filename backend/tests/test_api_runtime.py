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
