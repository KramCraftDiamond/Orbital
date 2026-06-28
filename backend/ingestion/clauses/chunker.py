import re
import uuid
from typing import List, Optional
from pydantic import BaseModel
from ingestion.extract.parser import Section


class Chunk(BaseModel):
    section_id: str
    heading_path: List[str]
    page_number: Optional[int]
    raw_text: str
    is_obligation_candidate: bool


# ── Fix 2: Expanded obligation keywords to include permissive language ────────
_OBLIGATION_PATTERN = re.compile(
    r'\b('
    r'must|shall|is required to|are required to|mandatory|shall ensure|'
    # Permissive / discretionary language — let the LLM set mandatory=false
    r'may|can|is permitted to|are permitted to|at its discretion|'
    r'is entitled to|are entitled to|'
    # Other mandatory-adjacent
    r'should|ought to|has to|have to|needs to'
    r')\b',
    re.IGNORECASE
)


def looks_like_obligation(text: str) -> bool:
    """
    Returns True if the text contains any mandatory OR permissive obligation language.
    Permissive phrases (may/can/permitted/discretion) are included so the LLM can
    populate mandatory=false for optional clauses rather than silently dropping them.
    """
    return bool(_OBLIGATION_PATTERN.search(text))


# ── Fix 6: Regex to detect real clause/paragraph identifiers ─────────────────
_CLAUSE_ID_PATTERN = re.compile(
    r'^('
    r'\d+(\.\d+)*'           # e.g. 3, 3.2, 3.2.1
    r'|[A-Z]\d+'              # e.g. A1, B3
    r'|\d+[A-Z]'              # e.g. 121A
    r'|Para(?:graph)?\s*\d+' # e.g. Para 4, Paragraph 12
    r'|Annex(?:ure)?\s*[IVXivx0-9A-Za-z]+' # e.g. Annex II, Annexure A
    r'|Clause\s*\d+'          # e.g. Clause 5
    r'|Article\s*\d+'         # e.g. Article 3
    r')',
    re.IGNORECASE
)


def _extract_clause_id(text: str) -> Optional[str]:
    """
    Attempts to find a leading clause/paragraph number in the text.
    Returns the matched identifier string, or None if none is found.
    """
    stripped = text.strip()
    m = _CLAUSE_ID_PATTERN.match(stripped)
    if m:
        return m.group(0).strip()
    return None


def split_text_by_clauses(text: str) -> List[str]:
    """Splits a block of text into multiple clauses if internal numbering is detected."""
    lines = text.split('\n')
    clauses = []
    current_clause = ""

    # Matches patterns like: "1. ", "(a) ", "a. ", "i. ", "IV. ", "Para 4. ", "Annex II "
    clause_pattern = re.compile(
        r'^(\d+(\.\d+)*\.?|\([a-zA-Z0-9]+\)|[a-zA-Z]\.|[IVX]+\.|Para(graph)?\s+\d+|Annex(ure)?\s+[IVX0-9A-Z]+)[\s:]',
        re.IGNORECASE
    )

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue

        if clause_pattern.match(line_stripped):
            if current_clause:
                clauses.append(current_clause.strip())
            current_clause = line_stripped
        else:
            if current_clause:
                current_clause += " " + line_stripped
            else:
                current_clause = line_stripped

    if current_clause:
        clauses.append(current_clause.strip())

    return clauses


def chunk_sections(sections: List[Section]) -> List[Chunk]:
    chunks = []
    orphan_buffer = ""
    orphan_clause_id: Optional[str] = None

    last_heading_path = []
    last_page_number = None

    for sec in sections:
        last_heading_path = sec.heading_path
        last_page_number = sec.page_number

        if getattr(sec, 'is_table', False):
            # Flush orphan buffer before a table
            if orphan_buffer:
                chunks.append(Chunk(
                    # Fix 6: Use real clause id if detected, else UUID
                    section_id=orphan_clause_id or str(uuid.uuid4()),
                    heading_path=sec.heading_path,
                    page_number=sec.page_number,
                    raw_text=orphan_buffer.strip(),
                    is_obligation_candidate=looks_like_obligation(orphan_buffer)
                ))
                orphan_buffer = ""
                orphan_clause_id = None

            chunks.append(Chunk(
                section_id=_extract_clause_id(sec.raw_text) or str(uuid.uuid4()),
                heading_path=sec.heading_path,
                page_number=sec.page_number,
                raw_text=sec.raw_text,
                is_obligation_candidate=looks_like_obligation(sec.raw_text)
            ))
            continue

        sub_texts = split_text_by_clauses(sec.raw_text)

        for text_part in sub_texts:
            combined_text = (orphan_buffer + "\n" + text_part).strip() if orphan_buffer else text_part.strip()
            orphan_buffer = ""
            orphan_clause_id = None

            # Fix 6: Try to extract a real clause id from the chunk text
            detected_id = _extract_clause_id(combined_text)

            # Orphan heuristic: short and doesn't end with a sentence terminator
            is_orphan = len(combined_text) < 100 and not re.search(r'[.!?:]$', combined_text)

            if is_orphan:
                orphan_buffer = combined_text
                orphan_clause_id = detected_id
            else:
                chunks.append(Chunk(
                    section_id=detected_id or str(uuid.uuid4()),
                    heading_path=sec.heading_path,
                    page_number=sec.page_number,
                    raw_text=combined_text,
                    is_obligation_candidate=looks_like_obligation(combined_text)
                ))

    # Flush remaining orphan
    if orphan_buffer.strip():
        chunks.append(Chunk(
            section_id=orphan_clause_id or str(uuid.uuid4()),
            heading_path=last_heading_path,
            page_number=last_page_number,
            raw_text=orphan_buffer.strip(),
            is_obligation_candidate=looks_like_obligation(orphan_buffer)
        ))

    return chunks
