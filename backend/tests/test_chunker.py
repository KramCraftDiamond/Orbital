import pytest
from pathlib import Path
from ingestion.extract.parser import parse_document
from ingestion.clauses.chunker import chunk_sections, looks_like_obligation

def test_chunker_logic():
    # Use the sample PDF to test chunking
    sample_path = Path(__file__).parent / "NT46BB3AE9CC38644D9A960F2017BA96D485.pdf"
    if not sample_path.exists():
        pytest.skip("sample.pdf not provided, skipping test")
        
    sections = parse_document(sample_path)
    chunks = chunk_sections(sections)
    
    assert len(chunks) > 0, "No chunks generated"
    
    obligations_count = sum(1 for c in chunks if c.is_obligation_candidate)
    
    print(f"\nTotal chunks generated: {len(chunks)}")
    print(f"Chunks flagged as obligations: {obligations_count}")
    
    # Ensure reasonable count (not 0, not all)
    assert obligations_count > 0, "No obligations found, which is unlikely for a regulatory doc."
    assert obligations_count < len(chunks), "Every chunk flagged as obligation, which is unlikely."
    
    # Validate structure
    first_chunk = chunks[0]
    assert hasattr(first_chunk, "section_id")
    assert hasattr(first_chunk, "heading_path")
    assert hasattr(first_chunk, "raw_text")

def test_looks_like_obligation():
    assert looks_like_obligation("The bank shall ensure that all records are kept.") is True
    assert looks_like_obligation("This is a mandatory requirement.") is True
    assert looks_like_obligation("Introduction to banking.") is False
