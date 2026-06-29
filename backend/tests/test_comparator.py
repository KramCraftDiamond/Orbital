import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from ingestion.comparator.schema import (
    LLMComparisonItem, ComparisonBatchResult, PolicyMatch,
)
from ingestion.comparator.comparator import (
    compare_obligations_to_policy,
    run_comparison,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_obligation(ob_id: str, action: str = "submit report") -> dict:
    """Build a minimal obligation dict matching pipeline.py output format."""
    return {
        "id": ob_id,
        "action": action,
        "domain": "KYC/AML",
        "departments": ["Compliance"],
        "severity": "high",
    }


def _make_policy_file(tmp_path: Path) -> Path:
    """Write a tiny policy text file for testing."""
    policy = tmp_path / "bank_policy.txt"
    policy.write_text(
        "Section 1: KYC Requirements\n"
        "The bank shall verify customer identity using Aadhaar or PAN.\n\n"
        "Section 2: AML Monitoring\n"
        "All transactions above INR 10 lakh must be reported to FIU.\n",
        encoding="utf-8",
    )
    return policy


# ── Test: covered obligation ─────────────────────────────────────────────────

def test_covered_obligation(tmp_path):
    """Obligation with a fully matching policy excerpt → status 'covered'."""
    ob = _make_obligation("OB-001", action="verify customer identity using Aadhaar")
    policy_file = _make_policy_file(tmp_path)

    mock_result = ComparisonBatchResult(items=[
        LLMComparisonItem(
            obligation_id="OB-001",
            status="covered",
            matched_policy_sections=[
                PolicyMatch(
                    policy_section_id="1",
                    policy_excerpt="The bank shall verify customer identity using Aadhaar or PAN.",
                )
            ],
            confidence=0.95,
        )
    ])

    with patch("ingestion.comparator.comparator.get_client") as mock_get_client, \
         patch("ingestion.comparator.comparator._load_policy_chunks") as mock_load:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        mock_load.return_value = [
            {"section_id": "1", "text": "The bank shall verify customer identity using Aadhaar or PAN.", "page": 1},
        ]

        comparisons = compare_obligations_to_policy([ob], policy_file)

        assert len(comparisons) == 1
        assert comparisons[0].status == "covered"
        assert len(comparisons[0].matched_policy_sections) == 1
        assert comparisons[0].confidence == 0.95

        # Verify temperature=0.1 was passed
        call_kwargs = mock_client.chat.completions.create.call_args
        assert call_kwargs.kwargs.get("temperature") == 0.1


# ── Test: gap obligation ─────────────────────────────────────────────────────

def test_gap_obligation(tmp_path):
    """Obligation with no candidate policy text → status 'gap', empty matches."""
    ob = _make_obligation("OB-002", action="implement biometric authentication")
    policy_file = _make_policy_file(tmp_path)

    mock_result = ComparisonBatchResult(items=[
        LLMComparisonItem(
            obligation_id="OB-002",
            status="gap",
            matched_policy_sections=[],
            gap_description="Bank policy does not address biometric authentication.",
            confidence=0.90,
        )
    ])

    with patch("ingestion.comparator.comparator.get_client") as mock_get_client, \
         patch("ingestion.comparator.comparator._load_policy_chunks") as mock_load:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        mock_load.return_value = []  # No policy chunks at all

        comparisons = compare_obligations_to_policy([ob], policy_file)

        assert len(comparisons) == 1
        assert comparisons[0].status == "gap"
        assert comparisons[0].matched_policy_sections == []
        assert comparisons[0].gap_description is not None


# ── Test: fallback for missing obligation_id ─────────────────────────────────

def test_fallback_for_missing_obligation_id(tmp_path):
    """LLM silently omits an obligation_id → fallback 'gap' record with confidence=0.0."""
    ob1 = _make_obligation("OB-010", action="report to FIU")
    ob2 = _make_obligation("OB-011", action="maintain transaction logs")
    policy_file = _make_policy_file(tmp_path)

    # LLM only returns result for OB-010, silently dropping OB-011
    mock_result = ComparisonBatchResult(items=[
        LLMComparisonItem(
            obligation_id="OB-010",
            status="covered",
            matched_policy_sections=[
                PolicyMatch(policy_section_id="2", policy_excerpt="report to FIU")
            ],
            confidence=0.88,
        )
    ])

    with patch("ingestion.comparator.comparator.get_client") as mock_get_client, \
         patch("ingestion.comparator.comparator._load_policy_chunks") as mock_load:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        mock_load.return_value = [
            {"section_id": "2", "text": "All transactions above INR 10 lakh must be reported to FIU.", "page": 1},
        ]

        comparisons = compare_obligations_to_policy([ob1, ob2], policy_file)

        assert len(comparisons) == 2

        by_id = {c.obligation_id: c for c in comparisons}
        assert by_id["OB-010"].status == "covered"

        # OB-011 should have a fallback gap record
        fallback = by_id["OB-011"]
        assert fallback.status == "gap"
        assert fallback.confidence == 0.0
        assert fallback.notes is not None
        assert "Manual review" in fallback.notes


# ── Test: run_comparison end-to-end ──────────────────────────────────────────

def test_run_comparison_end_to_end(tmp_path):
    """
    End-to-end: temp obligations JSON + temp policy file → output JSON
    with correct status counts.
    """
    # Write obligations JSON
    obligations = [
        _make_obligation("OB-100", action="verify identity"),
        _make_obligation("OB-101", action="report suspicious activity"),
    ]
    ob_json_path = tmp_path / "test_obligations.json"
    ob_json_path.write_text(
        json.dumps({"doc_id": "CIRC-2026-01", "obligations": obligations}),
        encoding="utf-8",
    )

    # Write policy file
    policy_file = _make_policy_file(tmp_path)

    # Mock LLM: one covered, one gap
    mock_result = ComparisonBatchResult(items=[
        LLMComparisonItem(
            obligation_id="OB-100",
            status="covered",
            matched_policy_sections=[
                PolicyMatch(policy_section_id="1", policy_excerpt="verify customer identity")
            ],
            confidence=0.92,
        ),
        LLMComparisonItem(
            obligation_id="OB-101",
            status="gap",
            matched_policy_sections=[],
            gap_description="No policy on suspicious activity reporting.",
            confidence=0.85,
        ),
    ])

    out_dir = tmp_path / "output"

    with patch("ingestion.comparator.comparator.get_client") as mock_get_client, \
         patch("ingestion.comparator.comparator._load_policy_chunks") as mock_load:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        mock_load.return_value = [
            {"section_id": "1", "text": "verify customer identity using Aadhaar", "page": 1},
        ]

        summary = run_comparison(
            obligations_json_path=ob_json_path,
            policy_path=policy_file,
            output_dir=str(out_dir),
            batch_size=2,
        )

    # Check output file exists
    expected_output = out_dir / "test_obligations_policy_comparison.json"
    assert expected_output.exists()

    # Load and verify contents
    with open(expected_output, "r", encoding="utf-8") as f:
        report = json.load(f)

    assert report["circular_doc_id"] == "CIRC-2026-01"
    assert report["policy_doc_name"] == "bank_policy.txt"
    assert report["summary"]["covered"] == 1
    assert report["summary"]["gap"] == 1
    assert report["summary"]["partial"] == 0
    assert report["summary"]["conflict"] == 0
    assert len(report["comparisons"]) == 2
