import pytest
from unittest.mock import patch, MagicMock
from ingestion.validate.validator import validate_obligations, ValidationResult

def test_validate_obligations_complete():
    obs_list = [{
        "actor": "Bank",
        "action": "submit report",
        "deadline": {"type": "relative", "value": "within 30 days"},
        "source_section": "sec_1"
    }]
    
    clause_texts = {
        "sec_1": "The Bank must submit the report within 30 days."
    }
    
    # Mock LLM returning "complete"
    mock_result = ValidationResult(missing_details="complete")
    
    with patch("ingestion.validate.validator.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        
        validated = validate_obligations(obs_list, clause_texts, backend="ollama")
        
        assert len(validated) == 1
        assert validated[0].get("review_flag") is None

def test_validate_obligations_missing_details():
    obs_list = [{
        "actor": "Bank",
        "action": "submit report",
        "deadline": {"type": "relative", "value": "within 30 days"},
        "source_section": "sec_2"
    }]
    
    clause_texts = {
        "sec_2": "The Bank must submit the report within 30 days, except on public holidays."
    }
    
    # Mock LLM finding a missing exception
    mock_result = ValidationResult(missing_details="Missing exception: except on public holidays.")
    
    with patch("ingestion.validate.validator.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_result
        mock_get_client.return_value = mock_client
        
        validated = validate_obligations(obs_list, clause_texts, backend="groq")
        
        assert len(validated) == 1
        assert validated[0].get("review_flag") == "Missing exception: except on public holidays."
        
def test_validate_obligations_missing_text():
    obs_list = [{
        "actor": "Bank",
        "action": "submit report",
        "source_section": "sec_3"
    }]
    
    # Missing raw text map entirely
    clause_texts = {}
    
    validated = validate_obligations(obs_list, clause_texts, backend="ollama")
    
    assert len(validated) == 1
    assert "Missing raw text" in validated[0].get("review_flag")
