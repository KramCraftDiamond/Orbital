"""
pipeline.py — Regulatory document ingestion pipeline.

Takes one input file, produces two output files:
  output/<name>.json        — rich structured obligations document
  output/<name>_graph.json  — D3-compatible node-link graph

Usage:
    python pipeline.py document.pdf
    python pipeline.py document.pdf --backend groq --out results/
    python pipeline.py document.pdf --backend groq --batch-size 10
    python pipeline.py document.pdf --backend groq --analyze --db reg.db
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("pipeline")


def run(
    input_path: str,
    backend: str = "groq",
    model: str = "",
    batch_size: int = 5,
    output_dir: str = "output",
    run_analysis: bool = False,
    db_path: str = ""          # empty = skip SQLite
) -> dict:
    input_file = Path(input_path)
    if not input_file.exists():
        raise FileNotFoundError(f"File not found: {input_path}")

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = input_file.stem

    # ── 1. Parse ──────────────────────────────────────────────────────────────
    logger.info(f"[1/5] Parsing: {input_file.name}")
    from ingestion.extract.parser import parse_document
    sections = parse_document(input_file)
    total_pages = len({s.page_number for s in sections if s.page_number})
    logger.info(f"      {len(sections)} sections, {total_pages} pages")

    # ── 2. Chunk ──────────────────────────────────────────────────────────────
    logger.info("[2/5] Chunking into clause-level chunks")
    from ingestion.clauses.chunker import chunk_sections
    chunks = chunk_sections(sections)
    candidates = [c for c in chunks if c.is_obligation_candidate]
    logger.info(f"      {len(chunks)} chunks, {len(candidates)} obligation candidates")

    # ── 3. Extract (batched LLM) ──────────────────────────────────────────────
    logger.info(f"[3/5] Extracting obligations — backend={backend}, batch_size={batch_size}")
    from ingestion.obligations.extractor import extract_document_context, extract_obligations_batch
    doc_context = extract_document_context(sections, backend=backend, model=model)
    raw_obligations = extract_obligations_batch(
        [c.model_dump() for c in chunks],
        backend=backend,
        model=model,
        doc_context=doc_context,
        batch_size=batch_size
    )
    logger.info(f"      {len(raw_obligations)} obligations extracted")

    if not raw_obligations:
        logger.warning("No obligations found — writing empty JSON and graph.")

    # ── 4. Normalize ──────────────────────────────────────────────────────────
    logger.info("[4/5] Normalizing (dept fuzzy-match + dedup + deadline format)")
    from ingestion.normalize.normalizer import normalize_obligations
    normalized = normalize_obligations(raw_obligations)
    logger.info(f"      {len(normalized)} after deduplication")

    if run_analysis and normalized:
        logger.info("[4b/5] Running second-pass obligation validation")
        from ingestion.validate.validator import validate_obligations
        clause_texts = {
            c.section_id: c.raw_text
            for c in chunks
            if getattr(c, "section_id", None)
        }
        for obs in normalized:
            if not obs.get("source_section") and obs.get("section_id"):
                obs["source_section"] = obs.get("section_id")
        normalized = validate_obligations(normalized, clause_texts, backend=backend)
        flagged_review = sum(1 for obs in normalized if obs.get("review_flag"))
        logger.info(f"      {flagged_review} obligations flagged for review")
    else:
        flagged_review = 0

    # ── 5. Assemble JSON + Graph ──────────────────────────────────────────────
    logger.info("[5/5] Building JSON + graph")

    # 5a. Rich document JSON
    from ingestion.output.formatter import build_document_output
    rich_doc = build_document_output(
        input_path=input_file,
        chunks=chunks,
        all_obligations=raw_obligations,
        doc_context=doc_context,
        total_pages=total_pages,
        backend=backend,
        model=model,
        run_analysis=run_analysis
    )
    json_path = out_dir / f"{stem}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rich_doc.model_dump(), f, indent=2, ensure_ascii=False, default=str)
    logger.info(f"      JSON  → {json_path}")

    # 5b. Graph (node-link JSON for D3 / Sigma.js)
    from ingestion.graph.builder import build_graph, export_json as graph_to_json
    graph = build_graph(normalized, source_doc_name=stem)
    graph_path = out_dir / f"{stem}_graph.json"
    with open(graph_path, "w", encoding="utf-8") as f:
        json.dump(graph_to_json(graph), f, indent=2, ensure_ascii=False, default=str)
    logger.info(f"      Graph → {graph_path}")

    # 5c. Optional SQLite persistence
    if db_path:
        from ingestion.storage.db import save_document, save_obligations
        doc_id = save_document(db_path, input_file.name)
        save_obligations(db_path, doc_id, normalized)
        logger.info(f"      DB    → {db_path} (doc_id={doc_id})")

    summary = {
        "document": input_file.name,
        "pages": total_pages,
        "chunks": len(chunks),
        "candidates": len(candidates),
        "obligations": len(raw_obligations),
        "after_dedup": len(normalized),
        "flagged_review": flagged_review,
        "departments_affected": sorted({
            d for obs in normalized
            for d in (obs.get("departments") or obs.get("department") or [])
        }),
        "graph_nodes": graph.number_of_nodes(),
        "graph_edges": graph.number_of_edges(),
        "json_output": str(json_path),
        "graph_output": str(graph_path),
    }
    _print_summary(summary)
    return summary


def _print_summary(s: dict):
    depts = s.get("departments_affected", [])
    print("\n" + "═" * 56)
    print("  PIPELINE COMPLETE")
    print("═" * 56)
    print(f"  Document   : {s['document']}")
    print(f"  Pages      : {s['pages']}")
    print(f"  Chunks     : {s['chunks']}  ({s['candidates']} obligation candidates)")
    print(f"  Obligations: {s['obligations']}  ({s['after_dedup']} after dedup)")
    print(f"  Graph      : {s['graph_nodes']} nodes, {s['graph_edges']} edges")
    if depts:
        print(f"  Departments: {', '.join(depts)}")
    print(f"\n  ✓  {s['json_output']}")
    print(f"  ✓  {s['graph_output']}")
    print("═" * 56 + "\n")


def main():
    p = argparse.ArgumentParser(description="Regulatory obligation extractor")
    p.add_argument("input_file",  help="Input PDF / DOCX / PPTX")
    p.add_argument("--backend",   choices=["groq", "ollama"], default="groq")
    p.add_argument("--model",     default="", help="Override model name (e.g. mistral, llama3)")
    p.add_argument("--batch-size",type=int, default=5, dest="batch_size",
                   help="Chunks per LLM call — higher = fewer API calls (default: 5)")
    p.add_argument("--out",       default="output", help="Output directory (default: output/)")
    p.add_argument("--analyze",   action="store_true",
                   help="Extra LLM call for document-level analysis (costs 1 API call)")
    p.add_argument("--validate",  action="store_true",
                   help="Run second-pass LLM validation for extracted obligations")
    p.add_argument("--db",        default="", metavar="PATH",
                   help="Save to SQLite DB at this path (optional)")
    args = p.parse_args()

    try:
        run(
            input_path=args.input_file,
            backend=args.backend,
            model=args.model,
            batch_size=args.batch_size,
            output_dir=args.out,
            run_analysis=args.analyze or args.validate,
            db_path=args.db
        )
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
