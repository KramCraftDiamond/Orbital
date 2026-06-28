import logging
from typing import List
from pathlib import Path
import fitz
from PIL import Image
import numpy as np

from ingestion.extract.parser import Section

logger = logging.getLogger(__name__)

def get_ocr_engine():
    try:
        from paddleocr import PaddleOCR
        return PaddleOCR(use_angle_cls=True, lang='en'), True
    except ImportError:
        return None, False

def process_with_fallback(file_path: str | Path, partial_sections: List[Section]) -> List[Section]:
    """
    Rasterize each PDF page and run OCR where native text is garbled/missing.
    Unifies the results with whatever native text was good.
    """
    file_path = Path(file_path)
    doc = fitz.open(file_path)
    
    # Group partial_sections from docling by page
    from collections import defaultdict
    sections_by_page = defaultdict(list)
    for sec in partial_sections:
        if sec.page_number is not None:
            sections_by_page[sec.page_number].append(sec)
            
    unified_sections: List[Section] = []
    
    ocr_engine, use_paddle = get_ocr_engine()
    if not use_paddle:
        import pytesseract
        logger.info("PaddleOCR not found. Using pytesseract for OCR fallback.")
    else:
        logger.info("Using PaddleOCR for OCR fallback.")
        
    for page_num in range(len(doc)):
        real_page_num = page_num + 1
        
        # Check if the docling sections for this page are "good"
        page_sections = sections_by_page.get(real_page_num, [])
        page_text = " ".join(s.raw_text for s in page_sections)
        
        total_chars = len(page_text.strip())
        alpha_chars = sum(1 for c in page_text if c.isalpha())
        
        # Heuristic: If this specific page has decent native text, keep it!
        if total_chars > 50 and (alpha_chars / total_chars > 0.3):
            logger.info(f"Page {real_page_num}: Using native text extraction (docling).")
            unified_sections.extend(page_sections)
            continue
            
        logger.info(f"Page {real_page_num}: Required OCR.")
        
        # Rasterize and OCR
        page = doc.load_page(page_num)
        zoom = 2.0  # Increase resolution for better OCR accuracy
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        mode = "RGBA" if pix.alpha else "RGB"
        img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
        if mode == "RGBA":
            img = img.convert("RGB")
            
        raw_text = ""
        if use_paddle:
            img_array = np.array(img)
            # cv2 format is BGR, so swap RGB to BGR
            img_bgr = img_array[:, :, ::-1]
            result = ocr_engine.ocr(img_bgr, cls=True)
            # PaddleOCR returns a list of items for the page. result[0] has the detections.
            if result and result[0]:
                lines = [line[1][0] for line in result[0]]
                raw_text = "\n".join(lines)
        else:
            raw_text = pytesseract.image_to_string(img)
            
        if raw_text.strip():
            unified_sections.append(Section(
                heading_path=[],  # Pure OCR doesn't provide semantic headings easily
                page_number=real_page_num,
                raw_text=raw_text.strip(),
                is_table=False
            ))
            
    doc.close()
    return unified_sections
