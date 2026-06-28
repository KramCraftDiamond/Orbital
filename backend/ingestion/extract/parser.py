import argparse
from pathlib import Path
from typing import List, Optional
import logging
from pydantic import BaseModel
from docling.document_converter import DocumentConverter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NeedsOCR(Exception):
    """Raised when the document appears to be a scanned image lacking extractable text."""
    def __init__(self, message: str, partial_sections: List["Section"]):
        super().__init__(message)
        self.partial_sections = partial_sections

class Section(BaseModel):
    heading_path: List[str]
    page_number: Optional[int]
    raw_text: str
    is_table: bool

def _parse_with_docling(file_path: Path) -> List[Section]:
    converter = DocumentConverter()
    result = converter.convert(file_path)
    doc = result.document

    total_text = ""
    sections: List[Section] = []
    current_heading_path = []
    
    for node in doc.iterate_items():
        if isinstance(node, tuple):
            item, level = node
        else:
            item = node
            level = 1 

        label = getattr(item, "label", "")
        page_no = None
        if hasattr(item, "prov") and item.prov:
            page_no = item.prov[0].page_no
        
        raw_text = ""
        is_table = False
        
        if label == "table":
            is_table = True
            try:
                df = item.export_to_dataframe()
                raw_text = df.to_csv(index=False) if df is not None else ""
            except Exception:
                raw_text = getattr(item, "text", "")
        elif hasattr(item, "text"):
            raw_text = item.text
            
        total_text += raw_text + " "
        
        if label and ("header" in label.lower() or "title" in label.lower()):
            if level is not None:
                current_heading_path = current_heading_path[:max(0, level - 1)]
                current_heading_path.append(raw_text)
            else:
                current_heading_path = [raw_text]
            
        if raw_text.strip():
            sections.append(Section(
                heading_path=current_heading_path.copy(),
                page_number=page_no,
                raw_text=raw_text.strip(),
                is_table=is_table
            ))

    total_chars = len(total_text.strip())
    alpha_chars = sum(1 for c in total_text if c.isalpha())
    
    if file_path.suffix.lower() == ".pdf" and (total_chars < 50 or (total_chars > 0 and alpha_chars / total_chars < 0.3)):
        raise NeedsOCR(
            f"Extracted text is very short or garbled (Total Chars: {total_chars}, Alpha Ratio: {alpha_chars/total_chars if total_chars else 0:.2f}). "
            "This suggests a scanned PDF or poor extraction quality that needs OCR.",
            partial_sections=sections
        )

    return sections

def parse_document(file_path: str | Path) -> List[Section]:
    """
    Parses a document. If it suspects a scanned PDF, it falls back to OCR seamlessly.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        return _parse_with_docling(file_path)
    except NeedsOCR as e:
        logger.warning(f"NeedsOCR raised. Automatically retrying with OCR fallback...")
        from ingestion.extract.ocr_fallback import process_with_fallback
        return process_with_fallback(file_path, e.partial_sections)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse document and output section tree")
    parser.add_argument("file_path", help="Path to the document (PDF, DOCX, etc.)")
    args = parser.parse_args()
    
    sections = parse_document(args.file_path)
    print(f"Extracted {len(sections)} sections.")
    for i, sec in enumerate(sections):
        print(f"--- Section {i+1} ---")
        print(f"Heading Path: {sec.heading_path}")
        print(f"Page: {sec.page_number}")
        print(f"Type: {'Table' if sec.is_table else 'Text'}")
        print(f"Text: {sec.raw_text[:150]}{'...' if len(sec.raw_text) > 150 else ''}\n")
