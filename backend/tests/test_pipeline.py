"""
Integration test for the full pipeline.
Runs against the sample PDF and asserts the pipeline completes without errors
and produces at least one obligation.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from ingestion.obligations.schema import Obligation

SAMPLE_PDF = Path(__file__).parent / "NT46BB3AE9CC38644D9A960F2017BA96D485.pdf"
TEST_DB_PATH = ":memory:"  # Not used directly; we supply tmp_path below

def make_fake_obligation(**overrides) -> Obligation:
    defaults = dict(
        actor="Bank",
        action="submit compliance report",
        deadline="within 30 days",
        mandatory=True,
        domain="Compliance",
        department=["Compliance"],
        evidence_required=["report document"],
        severity="high",
        source_section="1.1",
        source_page=1,
    )
    defaults.update(overrides)
    return Obligation(**defaults)

@pytest.fixture
def temp_db(tmp_path):
    return str(tmp_path / "test_pipeline.db")

@pytest.mark.skipif(not SAMPLE_PDF.exists(), reason="Sample PDF not available")
def test_pipeline_full_with_mock_llm(temp_db):
    """
    Full integration test. Uses real document extraction + chunking but mocks
    the LLM extraction step so no API key is needed.
    """
    from pipeline import run_pipeline

    fake_obligation = make_fake_obligation()

    with patch("ingestion.obligations.extractor.get_client") as mock_get_client:
        mock_client = MagicMock()

        from ingestion.obligations.extractor import ExtractionResult
        mock_result = ExtractionResult(
            is_obligation=True,
            obligation=fake_obligation
        )
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client

        summary = run_pipeline(
            input_path=str(SAMPLE_PDF),
            backend="groq",
            run_validation=False,
            db_path=temp_db
        )

    # Assertions
    assert summary["pages_processed"] >= 1, "Should process at least 1 page"
    assert summary["chunks_found"] > 0, "Should produce chunks"
    assert summary["obligations_extracted"] >= 1, "Should extract at least 1 obligation"
    assert summary["obligations_flagged_for_review"] == 0, "No validation, so no flags"

    # Verify it was persisted to the DB
    import sqlite_utils
    db = sqlite_utils.Database(temp_db)
    obs_rows = list(db["obligations"].rows)
    assert len(obs_rows) >= 1

    doc_rows = list(db["documents"].rows)
    assert len(doc_rows) == 1
    assert "NT46" in doc_rows[0]["filename"]


@pytest.mark.skipif(not SAMPLE_PDF.exists(), reason="Sample PDF not available")
def test_pipeline_no_obligations_extracted_gracefully(temp_db):
    """
    Tests that if the LLM consistently returns is_obligation=False,
    the pipeline exits gracefully without crashing.
    """
    from pipeline import run_pipeline

    with patch("ingestion.obligations.extractor.get_client") as mock_get_client:
        mock_client = MagicMock()
        from ingestion.obligations.extractor import ExtractionResult
        mock_result = ExtractionResult(is_obligation=False, obligation=None)
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client

        summary = run_pipeline(
            input_path=str(SAMPLE_PDF),
            backend="groq",
            run_validation=False,
            db_path=temp_db
        )

    assert summary["obligations_extracted"] == 0
    # Pipeline should still have parsed pages and chunks
    assert summary["pages_processed"] >= 1
    assert summary["chunks_found"] > 0


def test_pipeline_file_not_found(temp_db):
    """Tests that a missing file raises FileNotFoundError cleanly."""
    from pipeline import run_pipeline
    with pytest.raises(FileNotFoundError):
        run_pipeline("nonexistent_file.pdf", db_path=temp_db)
