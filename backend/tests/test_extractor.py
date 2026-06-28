import pytest
from unittest.mock import patch, MagicMock

from ingestion.obligations.schema import Obligation
from ingestion.obligations.extractor import extract_obligation, ExtractionResult

def test_extract_obligation_mocked_success():
    chunk = {
        "section_id": "test_1",
        "raw_text": "The bank must submit the audit report by Friday.",
        "is_obligation_candidate": True,
        "page_number": 2,
        "heading_path": ["Audit"]
    }
    
    # Create a mock result that instructor would return
    mock_result = ExtractionResult(
        is_obligation=True,
        obligation=Obligation(
            actor="The bank",
            action="submit the audit report",
            deadline="Friday",
            mandatory=True,
            domain="Audit",
            department=["Internal Audit"],
            evidence_required=["audit report"],
            severity="high",
            source_section="",  # Extractor should override this
            source_page=0       # Extractor should override this
        )
    )
    
    with patch("ingestion.obligations.extractor.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        
        obl = extract_obligation(chunk, backend="ollama")
        
        assert obl is not None
        assert obl.actor == "The bank"
        # Validate that the extractor correctly injected the source metadata
        assert obl.source_section == "test_1"
        assert obl.source_page == 2
        # Validate client was called
        mock_client.chat.completions.create.assert_called_once()

def test_extract_obligation_skipped():
    chunk = {
        "section_id": "test_2",
        "raw_text": "Introduction to banking.",
        "is_obligation_candidate": False
    }
    
    with patch("ingestion.obligations.extractor.get_client") as mock_get_client:
        obl = extract_obligation(chunk, backend="ollama")
        
        assert obl is None
        # get_client shouldn't even be called because the pre-filter skips it
        mock_get_client.assert_not_called()

def test_extract_obligation_not_an_obligation():
    chunk = {
        "section_id": "test_3",
        "raw_text": "Some text that uses the word 'must' but isn't actually an obligation.",
        "is_obligation_candidate": True
    }
    
    # Model decides it's not a real obligation
    mock_result = ExtractionResult(
        is_obligation=False,
        obligation=None
    )
    
    with patch("ingestion.obligations.extractor.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        
        obl = extract_obligation(chunk, backend="ollama")
        
        assert obl is None
