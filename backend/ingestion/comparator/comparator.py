"""
comparator.py — Policy comparison agent.

Compares extracted obligations (from pipeline.py output) against an internal
bank policy document, producing a coverage gap-analysis JSON report.

Usage:
    python -m ingestion.comparator.comparator obligations.json policy.pdf
    python -m ingestion.comparator.comparator obligations.json policy.pdf --out results/
    python -m ingestion.comparator.comparator obligations.json policy.pdf --batch-size 4
"""

import os
import json
import argparse
import logging
import sys
from difflib import SequenceMatcher
from pathlib import Path
from datetime import datetime
from typing import Any
from dotenv import load_dotenv
load_dotenv()

try:
    from rapidfuzz import process, fuzz
except ModuleNotFoundError:
    process = None
    fuzz = None

from ingestion.comparator.schema import (
    LLMComparisonItem, ComparisonBatchResult,
    ObligationComparison, ComparisonReport, PolicyMatch
)

logger = logging.getLogger(__name__)


# ── Global client ─────────────────────────────────────────────────────────────
_groq_client = None


def get_client() -> Any:
    """Singleton instructor-wrapped Groq client (same pattern as extractor.py)."""
    import instructor
    from openai import OpenAI

    global _groq_client
    if _groq_client is None:
        _groq_client = instructor.from_openai(
            OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=os.environ.get("GROQ_API_KEY", "dummy"),
            ),
            mode=instructor.Mode.TOOLS
        )
    return _groq_client


# ── Policy document loading ──────────────────────────────────────────────────

def _load_policy_chunks(policy_path: str | Path) -> list[dict]:
    """
    Parse and chunk a bank policy document using the existing parser/chunker.
    Returns list of {section_id, text, page} dicts.
    """
    from ingestion.extract.parser import parse_document
    from ingestion.clauses.chunker import chunk_sections

    sections = parse_document(policy_path)
    chunks = chunk_sections(sections)
    logger.info(f"Policy document: {len(sections)} sections → {len(chunks)} chunks")

    return [
        {
            "section_id": c.section_id,
            "text": c.raw_text,
            "page": c.page_number,
        }
        for c in chunks
    ]


# ── Fuzzy shortlisting (pre-LLM filter) ──────────────────────────────────────

def _shortlist_policy_chunks(
    obligation_text: str,
    policy_chunks: list[dict],
    top_k: int = 3
) -> list[dict]:
    """
    Use rapidfuzz token_set_ratio to shortlist the most relevant policy chunks
    for a given obligation BEFORE calling the LLM.  Keeps prompt size manageable
    and avoids stuffing the whole policy doc into every call.
    """
    if not policy_chunks or not obligation_text.strip():
        return []

    choices = {i: chunk["text"] for i, chunk in enumerate(policy_chunks)}
    if process and fuzz:
        results = process.extract(
            obligation_text,
            choices,
            scorer=fuzz.token_set_ratio,
            limit=top_k,
        )

        # results: list of (match_text, score, key)
        shortlisted = [policy_chunks[idx] for _, _, idx in results]
    else:
        scored = sorted(
            choices,
            key=lambda idx: SequenceMatcher(None, obligation_text.lower(), choices[idx].lower()).ratio(),
            reverse=True,
        )
        shortlisted = [policy_chunks[idx] for idx in scored[:top_k]]
    return shortlisted


# ── System prompt ─────────────────────────────────────────────────────────────

def _build_system_prompt() -> str:
    """Build the system prompt for the compliance gap-analysis agent."""
    return (
        "You are a regulatory compliance gap-analysis agent for Indian banking.\n"
        "You are given a batch of regulatory obligations extracted from an RBI circular\n"
        "and, for each obligation, a shortlist of candidate sections from the bank's\n"
        "internal policy document.\n\n"
        "YOUR TASK: For each obligation, compare it line-by-line against the provided\n"
        "policy excerpts and determine coverage status.\n\n"
        "RULES:\n"
        "- obligation_id: copy EXACTLY from the input — never modify it.\n"
        "- status: one of 'covered', 'partial', 'gap', 'conflict'.\n"
        "  • covered  — the policy fully addresses the obligation.\n"
        "  • partial  — the policy addresses some but not all aspects.\n"
        "  • gap      — the policy does not address this obligation at all.\n"
        "  • conflict — the policy contradicts the obligation.\n"
        "- matched_policy_sections: cite ONLY policy_section_id values from the\n"
        "  candidate excerpts you were given. NEVER invent policy section IDs or\n"
        "  fabricate policy text. Include a short excerpt proving the match.\n"
        "- If status is 'gap', matched_policy_sections MUST be an empty list [].\n"
        "- gap_description: explain what is missing (required for 'gap' and 'partial').\n"
        "- conflict_description: explain the contradiction (required for 'conflict').\n"
        "- recommended_policy_update: suggest specific policy language changes.\n"
        "- confidence: float 0.0–1.0 (NUMBER, not a string).\n"
        "- Return one item per obligation_id. Do NOT omit any obligation.\n"
    )


# ── Core comparison logic ────────────────────────────────────────────────────

def compare_obligations_to_policy(
    obligations: list[dict],
    policy_path: str | Path,
    model: str = "",
    batch_size: int = 2,
    top_k_chunks: int = 3
) -> list[ObligationComparison]:
    """
    Compare obligations against a policy document using batched LLM calls.

    Follows the same batching pattern as extract_obligations_batch in extractor.py,
    but with temperature=0.1 for deterministic/grounded output, and lower defaults
    (batch_size=2, top_k_chunks=3) since each comparator item carries multiple
    policy excerpts and is much heavier per call.
    """
    client = get_client()
    _model = model or "llama-3.3-70b-versatile"
    system_prompt = _build_system_prompt()

    # Load and chunk the policy document
    policy_chunks = _load_policy_chunks(policy_path)

    # Index obligations by id for fast lookup
    obligations_by_id = {ob.get("id", ""): ob for ob in obligations}
    all_comparisons: list[ObligationComparison] = []
    seen_ids: set[str] = set()
    total_calls = 0

    # Split obligations into batches
    for batch_start in range(0, len(obligations), batch_size):
        batch = obligations[batch_start: batch_start + batch_size]

        # Build per-obligation context blocks with shortlisted policy chunks
        obligations_block = ""
        for ob in batch:
            ob_id = ob.get("id", "")
            ob_action = ob.get("action", "")
            ob_text = f"{ob_action} {ob.get('domain', '')} {' '.join(ob.get('departments', []))}"

            shortlisted = _shortlist_policy_chunks(ob_text, policy_chunks, top_k=top_k_chunks)

            obligations_block += f"\n[OBLIGATION_ID:{ob_id}]\n"
            obligations_block += f"Action: {ob_action}\n"
            obligations_block += f"Domain: {ob.get('domain', 'Other')}\n"
            obligations_block += f"Severity: {ob.get('severity', 'medium')}\n"

            if shortlisted:
                obligations_block += "CANDIDATE POLICY SECTIONS:\n"
                for chunk in shortlisted:
                    obligations_block += (
                        f"  [POLICY_SECTION:{chunk['section_id']}] "
                        f"(page {chunk.get('page', '?')})\n"
                        f"  {chunk['text'][:500]}\n\n"
                    )
            else:
                obligations_block += "CANDIDATE POLICY SECTIONS: (none found)\n"

        user_prompt = f"OBLIGATIONS TO COMPARE:\n{obligations_block}"

        try:
            total_calls += 1
            result: ComparisonBatchResult = client.chat.completions.create(
                model=_model,
                response_model=ComparisonBatchResult,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_retries=2,
                temperature=0.1,
            )

            items = result.items or []
            for item in items:
                seen_ids.add(item.obligation_id)
                ob = obligations_by_id.get(item.obligation_id, {})
                comparison = ObligationComparison(
                    obligation_id=item.obligation_id,
                    action=ob.get("action", ""),
                    domain=ob.get("domain", "Other"),
                    departments=ob.get("departments", []),
                    severity=ob.get("severity", "medium"),
                    status=item.status,
                    matched_policy_sections=item.matched_policy_sections,
                    gap_description=item.gap_description,
                    conflict_description=item.conflict_description,
                    recommended_policy_update=item.recommended_policy_update,
                    confidence=item.confidence,
                )
                all_comparisons.append(comparison)

            logger.info(
                f"Batch {total_calls}: {len(batch)} obligations → {len(items)} comparisons"
            )

        except Exception as e:
            logger.error(f"Batch {total_calls} failed: {e}")

        # ── Fallback: detect dropped obligation_ids per batch ─────────────
        batch_ids = {ob.get("id", "") for ob in batch}
        dropped = batch_ids - seen_ids
        for dropped_id in dropped:
            ob = obligations_by_id.get(dropped_id, {})
            all_comparisons.append(ObligationComparison(
                obligation_id=dropped_id,
                action=ob.get("action", ""),
                domain=ob.get("domain", "Other"),
                departments=ob.get("departments", []),
                severity=ob.get("severity", "medium"),
                status="gap",
                matched_policy_sections=[],
                gap_description="Auto-flagged: LLM did not return a result for this obligation.",
                confidence=0.0,
                notes="Manual review required — LLM omitted this obligation from its response.",
            ))
            seen_ids.add(dropped_id)
            logger.warning(f"Fallback gap record created for dropped obligation: {dropped_id}")

    logger.info(
        f"Comparison complete. API calls: {total_calls} | "
        f"Total comparisons: {len(all_comparisons)}"
    )
    return all_comparisons


# ── Report builder + runner ───────────────────────────────────────────────────

def run_comparison(
    obligations_json_path: str | Path,
    policy_path: str | Path,
    output_dir: str = "output",
    batch_size: int = 2,
    model: str = "",
) -> dict:
    """
    End-to-end comparison: load obligations JSON → compare against policy →
    build ComparisonReport → save JSON → print summary.
    """
    obligations_json_path = Path(obligations_json_path)
    policy_path = Path(policy_path)

    if not obligations_json_path.exists():
        raise FileNotFoundError(f"Obligations JSON not found: {obligations_json_path}")
    if not policy_path.exists():
        raise FileNotFoundError(f"Policy file not found: {policy_path}")

    # Load obligations
    with open(obligations_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Support both top-level list and nested {obligations: [...]} formats
    if isinstance(data, list):
        obligations = data
        circular_doc_id = ""
    else:
        obligations = data.get("obligations", [])
        circular_doc_id = data.get("doc_id", "")

    logger.info(f"Loaded {len(obligations)} obligations from {obligations_json_path.name}")

    # Run comparison
    comparisons = compare_obligations_to_policy(
        obligations=obligations,
        policy_path=policy_path,
        model=model,
        batch_size=batch_size,
    )

    # Build status counts
    counts = {"covered": 0, "partial": 0, "gap": 0, "conflict": 0}
    for c in comparisons:
        counts[c.status] = counts.get(c.status, 0) + 1

    # Assemble report
    report = ComparisonReport(
        circular_doc_id=circular_doc_id,
        policy_doc_name=policy_path.name,
        generated_at=datetime.now().isoformat(),
        summary=counts,
        comparisons=comparisons,
    )

    # Save output
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = obligations_json_path.stem
    out_path = out_dir / f"{stem}_policy_comparison.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report.model_dump(), f, indent=2, ensure_ascii=False, default=str)
    logger.info(f"Report → {out_path}")

    summary = {
        "obligations_file": obligations_json_path.name,
        "policy_file": policy_path.name,
        "total_obligations": len(obligations),
        "total_comparisons": len(comparisons),
        **counts,
        "output": str(out_path),
    }
    _print_summary(summary)
    return summary


def _print_summary(s: dict):
    print("\n" + "=" * 56)
    print("  POLICY COMPARISON COMPLETE")
    print("=" * 56)
    print(f"  Obligations : {s['obligations_file']}")
    print(f"  Policy      : {s['policy_file']}")
    print(f"  Total       : {s['total_obligations']} obligations -> {s['total_comparisons']} comparisons")
    print(f"  Covered     : {s.get('covered', 0)}")
    print(f"  Partial     : {s.get('partial', 0)}")
    print(f"  Gap         : {s.get('gap', 0)}")
    print(f"  Conflict    : {s.get('conflict', 0)}")
    print(f"\n  [ok]  {s['output']}")
    print("=" * 56 + "\n")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Compare obligations against bank policy")
    p.add_argument("obligations_json", help="Path to obligations JSON (pipeline.py output)")
    p.add_argument("policy_file",      help="Path to bank policy document (PDF / DOCX / TXT)")
    p.add_argument("--out",            default="output", help="Output directory (default: output/)")
    p.add_argument("--batch-size",     type=int, default=2, dest="batch_size",
                   help="Obligations per LLM call (default: 2)")
    p.add_argument("--model",          default="", help="Override model name (e.g. llama-3.3-70b-versatile)")
    args = p.parse_args()

    try:
        run_comparison(
            obligations_json_path=args.obligations_json,
            policy_path=args.policy_file,
            output_dir=args.out,
            batch_size=args.batch_size,
            model=args.model,
        )
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
