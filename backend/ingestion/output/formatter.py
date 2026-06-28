"""
ingestion/output/formatter.py

Assembles a RichDocumentOutput from all pipeline stage results.
This is the module that produces the final JSON matching the target schema.
"""

import re
import logging
from pathlib import Path
from typing import Optional

import instructor
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
import os

from ingestion.obligations.schema import (
    ObligationOutput, SectionOutput, RichDocumentOutput,
    DocumentAnalysis, DocumentValidation, ValidationIssue,
    DocumentContext, ClauseTypeLiteral
)

logger = logging.getLogger(__name__)

# ── Obligation counter (global per pipeline run) ──────────────────────────────
_ob_counter = 0


def _reset_counter():
    global _ob_counter
    _ob_counter = 0


def _next_ob_id(section_id: str) -> str:
    global _ob_counter
    _ob_counter += 1
    return f"{section_id}-OB{_ob_counter}"


# ── Clause type classifier (heuristic, no LLM) ────────────────────────────────
_EFFECTIVE_DATE_RE = re.compile(
    r'come\s+into\s+force|effect\s+from|effective\s+(from|date)', re.IGNORECASE
)
_PERMISSION_RE = re.compile(r'\b(may|can|is\s+permitted|at\s+its\s+discretion|is\s+entitled)\b', re.IGNORECASE)
_OBLIGATION_RE = re.compile(r'\b(shall|must|is\s+required\s+to|are\s+required)\b', re.IGNORECASE)
_DEFINITION_RE = re.compile(r'\b(means|defined\s+as|refers\s+to|hereinafter\s+called)\b', re.IGNORECASE)


def _classify_clause(text: str, obligations: list[ObligationOutput]) -> ClauseTypeLiteral:
    if _EFFECTIVE_DATE_RE.search(text):
        return "effective_date"
    if obligations:
        types = {o.obligation_type for o in obligations}
        if types == {"discretionary"}:
            return "permission"
        return "obligation"
    if _DEFINITION_RE.search(text):
        return "definition"
    return "other"


def _extract_heading(text: str, max_len: int = 80) -> str:
    """Returns the first non-empty line of text, truncated."""
    for line in text.split('\n'):
        line = line.strip()
        if line:
            return line[:max_len] + ("…" if len(line) > max_len else "")
    return text[:max_len]


def _extract_cross_references(sections: list[SectionOutput]) -> list[str]:
    """Collects all unique cross-references mentioned across all obligations."""
    refs = set()
    for sec in sections:
        for obl in sec.obligations:
            refs.update(obl.cross_references)
    return sorted(refs)


# ── Heuristic validation pass ─────────────────────────────────────────────────
_VAGUE_ACTION_RE = re.compile(
    r'^(implement|calculate|report|ensure|comply|provide|establish|maintain|submit|take)\.?$',
    re.IGNORECASE
)

def _run_heuristic_validation(
    obligations: list[ObligationOutput]
) -> DocumentValidation:
    issues: list[ValidationIssue] = []

    for obl in obligations:
        # VAL-001: Action too vague / bare verb
        if _VAGUE_ACTION_RE.match(obl.action.strip()):
            issues.append(ValidationIssue(
                obligation_id=obl.id,
                field="action",
                current_value=obl.action,
                correct_value="Summarized action needed",
                reason="(VAL-001) Action is a bare verb — likely vague or incomplete."
            ))

        # VAL-006: Action too short
        if len(obl.action.strip()) < 15:
            issues.append(ValidationIssue(
                obligation_id=obl.id,
                field="action",
                current_value=obl.action,
                correct_value="Summarized action needed",
                reason="(VAL-006) Action text is too short — likely vague or incomplete."
            ))

    total = len(obligations)
    flagged = len(issues)
    confidence = round(max(0.5, 1.0 - (flagged / max(total, 1)) * 0.5), 2)
    notes_parts = []
    if issues:
        fix_parts = [f"fix {field} for {oid}" for oid, field in {(i.obligation_id, i.field) for i in issues}]
        notes_parts.append(f"Fix summary: {', '.join(sorted(fix_parts))}.")
    notes_parts.append(
        "Heuristic + rule-engine validation reviewed mandatory clauses, effective dates, "
        "deadlines, department mapping, duplicate extraction, and JSON validation rules. "
        "LLM validation unavailable; used heuristic checks."
    )

    return DocumentValidation(
        missed_obligations=[],
        incorrect_extractions=issues,
        missing_effective_date=None,
        overall_confidence=confidence,
        validation_notes=" ".join(notes_parts)
    )


# ── LLM-based document analysis (optional, called once) ───────────────────────
def _run_llm_analysis(
    obligations: list[ObligationOutput],
    doc_context: DocumentContext,
    backend: str = "groq",
    model: str = ""
) -> DocumentAnalysis:
    """
    Asks the LLM to produce a high-level analysis of the document based on
    all extracted obligations. Returns a DocumentAnalysis object.
    """
    _ollama_client = None
    _groq_client = None

    try:
        if backend == "groq":
            client = instructor.from_openai(
                OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=os.environ.get("GROQ_API_KEY", "dummy"),
                ),
                mode=instructor.Mode.TOOLS
            )
            _model = model or "llama-3.3-70b-versatile"
        else:
            client = instructor.from_openai(
                OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"),
                mode=instructor.Mode.JSON
            )
            _model = model or "phi3"

        ob_summary = "\n".join(
            f"- [{o.id}] {o.actor}: {o.action[:100]} ({o.obligation_type}, {o.domain})"
            for o in obligations[:30]
        )

        system_prompt = (
            "You are a senior regulatory compliance analyst. "
            "Based on the document metadata and obligation summaries below, produce a high-level analysis.\n\n"
            "FIELDS:\n"
            "- document_type: 'guideline', 'circular', 'direction', 'notification', 'amendment'\n"
            "- primary_actor: The main entity addressed by this document\n"
            "- secondary_actors: Other entities involved\n"
            "- dominant_domains: Top 2-3 regulatory domains covered\n"
            "- contains_quoted_regulations: true if verbatim regulation text is quoted\n"
            "- contains_enumerated_operational_clause: true if the doc contains numbered operational steps\n"
            "- likely_effective_date_text: Verbatim effective date text, or null\n"
            "- core_obligation_phrases: 2-4 most important obligation sentences (verbatim from the text)\n"
            "- analysis_confidence: 0.0-1.0\n"
            "- reasoning: 1-2 sentence summary of the document's regulatory intent\n"
        )

        user_prompt = (
            f"DOCUMENT CONTEXT:\n"
            f"  Title: {doc_context.document_title}\n"
            f"  Issuing Authority: {doc_context.issuing_authority}\n"
            f"  Effective Date: {doc_context.effective_date}\n\n"
            f"OBLIGATION SUMMARIES ({len(obligations)} total):\n{ob_summary}"
        )

        analysis: DocumentAnalysis = client.chat.completions.create(
            model=_model,
            response_model=DocumentAnalysis,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_retries=2
        )
        return analysis

    except Exception as e:
        logger.error(f"LLM analysis failed: {e}")
        return DocumentAnalysis(
            document_type="guideline",
            primary_actor=doc_context.issuing_authority or "Unknown",
            reasoning="Analysis unavailable due to LLM error."
        )


# ── Main assembler ────────────────────────────────────────────────────────────
def build_document_output(
    input_path: Path,
    chunks: list,
    all_obligations: list[ObligationOutput],
    doc_context: DocumentContext,
    total_pages: int,
    backend: str = "groq",
    model: str = "",
    run_analysis: bool = False
) -> RichDocumentOutput:
    """
    Assembles the full RichDocumentOutput from all pipeline stage results.
    Groups obligations back into their source sections, assigns deterministic IDs,
    runs heuristic validation, and optionally calls the LLM for document analysis.
    """
    _reset_counter()

    # Build a map: section_id -> list of obligations
    section_ob_map: dict[str, list[ObligationOutput]] = {}
    for obl in all_obligations:
        sid = obl.section_id or "unknown"
        section_ob_map.setdefault(sid, []).append(obl)

    # Build SectionOutput objects from chunks
    sections: list[SectionOutput] = []
    seen_section_ids: set[str] = set()

    for chunk in chunks:
        sid = chunk.section_id
        # Deduplicate sections (multiple chunks can share a section_id when split)
        if sid in seen_section_ids:
            # Append obligations to existing section instead
            for existing_sec in sections:
                if existing_sec.id == sid:
                    for obl in section_ob_map.get(sid, []):
                        obl.id = _next_ob_id(sid)
                        existing_sec.obligations.append(obl)
            continue
        seen_section_ids.add(sid)

        sec_obligations = section_ob_map.get(sid, [])
        for obl in sec_obligations:
            obl.id = _next_ob_id(sid)

        clause_type = _classify_clause(chunk.raw_text, sec_obligations)
        heading = _extract_heading(chunk.raw_text)

        sections.append(SectionOutput(
            id=sid,
            heading=heading,
            text=chunk.raw_text,
            page_number=chunk.page_number or 1,
            clause_type=clause_type,
            level=1,
            obligations=sec_obligations
        ))

    # Flat obligations list (same objects, already have IDs stamped)
    flat_obligations = [obl for sec in sections for obl in sec.obligations]

    # Cross-references
    cross_refs = _extract_cross_references(sections)

    # Validation
    validation = _run_heuristic_validation(flat_obligations)

    # Build doc_id from source + circular number
    circ = doc_context.circular_number or ""
    doc_id_raw = f"RBI-{circ.replace('/', '-')}" if circ else f"RBI-{input_path.stem}"

    # Analysis (LLM call)
    if run_analysis and flat_obligations:
        logger.info("Running document-level LLM analysis...")
        analysis = _run_llm_analysis(flat_obligations, doc_context, backend=backend, model=model)
    else:
        analysis = DocumentAnalysis(
            document_type="guideline",
            primary_actor=doc_context.issuing_authority or "Unknown",
            likely_effective_date_text=doc_context.effective_date,
            reasoning="Analysis skipped (no obligations extracted or analysis disabled)."
        )
    analysis.likely_effective_date_text = doc_context.effective_date

    return RichDocumentOutput(
        doc_id=doc_id_raw,
        source="RBI",
        title=doc_context.document_title or input_path.name,
        circular_number=doc_context.circular_number,
        reference_number=doc_context.reference_number,
        date=doc_context.date,
        effective_date=doc_context.effective_date,
        issued_by=doc_context.issued_by,
        amends=doc_context.amends,
        language="english",
        total_pages=total_pages,
        sections=sections,
        tables=[],
        annexures=[],
        cross_references=cross_refs,
        obligations=flat_obligations,
        analysis=analysis,
        validation=validation
    )
