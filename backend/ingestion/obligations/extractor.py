import os
import re
import logging
from typing import Optional
from dotenv import load_dotenv
load_dotenv()
from pydantic import BaseModel, Field
import instructor
from openai import OpenAI

from ingestion.obligations.schema import (
    ObligationOutput, DocumentContext,
    DEPARTMENTS, DOMAINS
)

logger = logging.getLogger(__name__)


# ── Response models ───────────────────────────────────────────────────────────

class ExtractionResult(BaseModel):
    obligations: list[ObligationOutput] = Field(
        default_factory=list,
        description=(
            "All distinct regulatory obligations found in ALL clauses provided. "
            "Each separate requirement, condition, or permission is a SEPARATE object. "
            "Return [] if no real obligations are present."
        )
    )


# ── Global clients ────────────────────────────────────────────────────────────
_ollama_client = None
_groq_client = None


def get_client(backend: str) -> instructor.Instructor:
    global _ollama_client, _groq_client
    if backend == "ollama":
        if _ollama_client is None:
            _ollama_client = instructor.from_openai(
                OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"),
                mode=instructor.Mode.JSON
            )
        return _ollama_client
    elif backend == "groq":
        if _groq_client is None:
            _groq_client = instructor.from_openai(
                OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=os.environ.get("GROQ_API_KEY", "dummy"),
                ),
                mode=instructor.Mode.TOOLS
            )
        return _groq_client
    else:
        raise ValueError(f"Unknown backend: {backend}")


# ── OPTIMIZATION 1: Regex-based document context (zero LLM calls) ─────────────
_CIRCULAR_RE = re.compile(r'RBI[/\s]*(\d{4}-\d{2,4}[/\s]*\d+)', re.IGNORECASE)
_DATE_RE = re.compile(
    r'\b(\d{1,2}[\s\-](?:January|February|March|April|May|June|July|August|September|October|November|December)[\s\-]\d{4}|\d{4}-\d{2}-\d{2})\b',
    re.IGNORECASE
)
_EFFECTIVE_DATE_RE = re.compile(
    r'(?:come\s+into\s+force|effect\s+from|effective\s+(?:from|date)[:\s]+)([\w\s,]+\d{4})',
    re.IGNORECASE
)
_ISSUED_BY_RE = re.compile(
    r'\(([A-Z][a-zA-Z\s]+)\)\s*\n\s*([A-Za-z\s]+(?:Manager|Director|Governor|Officer|General))',
    re.IGNORECASE
)
_AMENDS_RE = re.compile(
    r'(?:amend(?:ing|s|ment\s+to)?|modif(?:y|ies|ication\s+to))\s+(?:the\s+)?([^\n.]{10,120})',
    re.IGNORECASE
)


def extract_document_context(
    parsed_sections: list,
    backend: str = "groq",
    model: str = ""
) -> DocumentContext:
    """
    ZERO LLM CALLS — extracts document metadata using regex against the preamble text.
    Falls back to empty strings for fields not found. Saves ~1 Groq API call per document.
    """
    preamble_text = "\n".join(
        s.raw_text for s in parsed_sections[:12] if s.raw_text.strip()
    )

    # Circular number
    circ_match = _CIRCULAR_RE.search(preamble_text)
    circular_number = None
    if circ_match:
        raw = circ_match.group(0).replace(" ", "").upper()
        circular_number = raw  # e.g. "RBI/2026-27/46"

    # Issued date — first date found in preamble
    date_matches = _DATE_RE.findall(preamble_text)
    issued_date = date_matches[0] if date_matches else None

    # Effective date — look for "effect from" / "come into force" pattern
    eff_match = _EFFECTIVE_DATE_RE.search(preamble_text)
    effective_date = eff_match.group(1).strip() if eff_match else None

    # Document title — first long heading line (>30 chars, not a date/number)
    title = ""
    for line in preamble_text.split("\n"):
        line = line.strip()
        if len(line) > 30 and not re.match(r'^[\d/\-\s]+$', line):
            title = line[:200]
            break

    # Issuing authority
    issuing_authority = "Reserve Bank of India"  # default for RBI circulars
    if "SEBI" in preamble_text:
        issuing_authority = "SEBI"
    elif "IRDAI" in preamble_text:
        issuing_authority = "IRDAI"

    # Issued by (signatory)
    issued_by = None
    ib_match = _ISSUED_BY_RE.search(preamble_text)
    if ib_match:
        issued_by = f"{ib_match.group(1).strip()} - {ib_match.group(2).strip()}"

    # Amends
    amends = None
    amends_match = _AMENDS_RE.search(preamble_text)
    if amends_match:
        amends = amends_match.group(1).strip()

    # Referenced documents — look for quoted document names
    ref_docs = re.findall(
        r'(?:Reserve Bank of India\s*[(\[]?[^)\]]{5,80}[)\]]?(?:Directions|Act|Circular|Regulations)[,\s]*\d{4})',
        preamble_text, re.IGNORECASE
    )

    ctx = DocumentContext(
        document_title=title,
        issuing_authority=issuing_authority,
        effective_date=effective_date,
        date=issued_date,
        circular_number=circular_number,
        issued_by=issued_by,
        amends=amends,
        referenced_documents=list(dict.fromkeys(ref_docs))[:5]  # deduplicate, cap at 5
    )

    logger.info(
        f"Document context (regex): title='{ctx.document_title[:60]}' | "
        f"circular='{ctx.circular_number}' | effective_date='{ctx.effective_date}'"
    )
    return ctx


# ── OPTIMIZATION 2: Batched chunk extraction (N chunks per LLM call) ──────────

def _build_system_prompt() -> str:
    """Build the shared system prompt (called once per pipeline run)."""
    departments_str = ", ".join(DEPARTMENTS)
    domains_str = ", ".join(DOMAINS)

    return (
        "You are a regulatory compliance analyst for Indian banking.\n"
        "Extract ALL distinct obligations from ALL numbered clause texts provided.\n"
        "Return a single flat 'obligations' list covering every clause.\n\n"
        "RULES:\n"
        "- section_id / clause_number: the [SECTION:xxx] marker the obligation came from.\n"
        "- actor: who must act ('bank', 'board', 'branch manager'). Default: 'bank'.\n"
        "- action: full verb + object + conditions. Never bare verbs like 'implement' or 'ensure'.\n"
        "  GOOD: 'submit quarterly audit report to board by March 31'.\n"
        "- obligation_type: 'mandatory' (shall/must/required) or 'discretionary' (may/can/permitted).\n"
        "- trigger: exact trigger word from the text ('shall', 'may', 'must', etc.).\n"
        "- deadline.text: verbatim deadline from clause; 'None' if absent; 'ongoing' if continuous.\n"
        "- deadline.urgency: immediate | short_term | medium_term | long_term | ongoing.\n"
        "- deadline.absolute_date: ISO date YYYY-MM-DD only if a calendar date is explicit. Else null.\n"
        "- deadline.duration: e.g. '30 days' for relative deadlines. Else null.\n"
        f"- domain: one of [{domains_str}]. 'Other' only if none fit.\n"
        f"- departments: internal bank depts from [{departments_str}]. Infer from subject matter.\n"
        "- external_parties_referenced: regulators/bodies (RBI, SEBI) — NEVER put these in departments.\n"
        "- severity: critical | high | medium | low.\n"
        "- confidence: float 0.0–1.0 (NUMBER, not a string).\n"
        "- evidence_required: list of required documents/records. [] if none stated.\n"
        "- penalty_if_missed / fine_exposure_inr: stated penalty or null.\n"
        "- cross_references: other circulars/acts cited. [] if none.\n"
        "- notes: extraction caveats or null.\n"
        "- Return obligations=[] if no clauses contain real obligations.\n"
    )


def extract_obligations_batch(
    chunks: list[dict],
    backend: str = "groq",
    doc_context: Optional[DocumentContext] = None,
    model: str = "",
    batch_size: int = 5
) -> list[ObligationOutput]:
    """
    OPTIMIZATION: Groups chunks into batches of `batch_size` and makes ONE LLM call
    per batch instead of one call per chunk.

    For 6 obligation-candidate chunks with batch_size=5:
      Before: 6 API calls
      After:  2 API calls (batch of 5 + batch of 1)
    """
    client = get_client(backend)
    _model = model or ("llama-3.3-70b-versatile" if backend == "groq" else "phi3")
    system_prompt = _build_system_prompt()

    # Build context block (prepended once to every batch)
    ctx_block = ""
    if doc_context:
        ctx_block = (
            f"DOCUMENT CONTEXT:\n"
            f"  Circular : {doc_context.circular_number or 'Unknown'}\n"
            f"  Title    : {doc_context.document_title or 'Unknown'}\n"
            f"  Authority: {doc_context.issuing_authority or 'Unknown'}\n"
            f"  Eff. Date: {doc_context.effective_date or 'Not stated'}\n\n"
        )

    # Filter to only obligation candidates
    candidates = [c for c in chunks if c.get("is_obligation_candidate", True)]
    skipped = len(chunks) - len(candidates)
    all_obligations: list[ObligationOutput] = []
    total_calls = 0

    # Split candidates into batches
    for batch_start in range(0, len(candidates), batch_size):
        batch = candidates[batch_start: batch_start + batch_size]

        # Build numbered clause block for this batch
        clauses_block = ""
        for i, chunk in enumerate(batch, 1):
            sid = chunk.get("section_id", f"chunk_{i}")
            text = chunk.get("raw_text", "").strip()
            clauses_block += f"\n[SECTION:{sid}]\n{text}\n"

        user_prompt = f"{ctx_block}CLAUSES TO EXTRACT FROM:\n{clauses_block}"

        try:
            total_calls += 1
            result: ExtractionResult = client.chat.completions.create(
                model=_model,
                response_model=ExtractionResult,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_retries=2,
            )

            obligations = result.obligations or []
            for obl in obligations:
                # Inherit effective_date from doc context if clause didn't state one
                if obl.effective_date is None and doc_context and doc_context.effective_date:
                    obl.effective_date = doc_context.effective_date

            all_obligations.extend(obligations)
            logger.info(
                f"Batch {total_calls}: {len(batch)} chunks → {len(obligations)} obligations"
            )

        except Exception as e:
            logger.error(f"Batch {total_calls} failed: {e}")

    logger.info(
        f"Extraction complete. "
        f"API calls: {total_calls} | Skipped (pre-filter): {skipped} | "
        f"Total obligations: {len(all_obligations)}"
    )
    return all_obligations
