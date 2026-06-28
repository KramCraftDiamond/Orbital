import pytest
from pathlib import Path
from ingestion.extract.parser import parse_document, NeedsOCR

def test_parse_document_sections():
    # Expecting the sample PDF provided by the user in the tests directory
    sample_path = Path(__file__).parent / "NT46BB3AE9CC38644D9A960F2017BA96D485.pdf"
    
    if not sample_path.exists():
        pytest.skip("sample.pdf not provided by user, skipping test")

    try:
        sections = parse_document(sample_path)
        
        # Check basic expectations for a parsed document
        assert len(sections) > 0, "No sections were extracted"
        
        # Ensure page numbers are extracted correctly
        assert all(sec.page_number is not None for sec in sections), "Some sections are missing page numbers"
        
        # Ensure raw text is extracted
        assert any(len(sec.raw_text) > 0 for sec in sections), "Extracted raw text is empty"
        
        # Print for visual inspection when running with pytest -s
        print(f"Extracted {len(sections)} sections from sample.pdf")
        
    except NeedsOCR:
        # If the sample PDF is a scanned image, it should raise NeedsOCR
        pass
