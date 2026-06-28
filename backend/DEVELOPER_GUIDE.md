# Regulatory Obligation Extractor — Developer Guide

> **Audience:** Frontend developers integrating this pipeline into a web application.  
> **Purpose:** Explains what the pipeline does, what it takes as input, what it produces as output, how the code is structured, and where to make common frontend-facing changes.

---

## Table of Contents

1. [What It Does](#1-what-it-does)
2. [Quick Start](#2-quick-start)
3. [Input — What the Pipeline Accepts](#3-input)
4. [Output — What the Pipeline Produces](#4-output)
   - [4.1 Rich JSON Document (`<name>.json`)](#41-rich-json-document)
   - [4.2 Graph JSON (`<name>_graph.json`)](#42-graph-json)
5. [Full JSON Schema Reference](#5-full-json-schema-reference)
6. [Codebase Structure](#6-codebase-structure)
7. [Pipeline Stages — How Data Flows](#7-pipeline-stages)
8. [Key Files for Frontend Integration](#8-key-files-for-frontend-integration)
9. [Common Frontend Integration Tweaks](#9-common-frontend-integration-tweaks)
10. [Environment & Configuration](#10-environment--configuration)
11. [API Call Budget](#11-api-call-budget)

---

## 1. What It Does

This pipeline takes a **regulatory PDF** (e.g. an RBI circular) and automatically extracts every obligation, permission, and directive from it.

It outputs two files:

| File | Purpose |
|---|---|
| `output/<name>.json` | Full structured document with all metadata, sections, obligations, validation |
| `output/<name>_graph.json` | D3-compatible node-link graph: Circular → Domain → Department → Task → Evidence |

---

## 2. Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set your Groq API key
echo "GROQ_API_KEY=gsk_..." > .env

# Run on a PDF
python pipeline.py path/to/circular.pdf --backend groq --out output/

# All options
python pipeline.py path/to/file.pdf \
  --backend groq          \   # groq (cloud) or ollama (local)
  --model llama-3.3-70b-versatile \  # override model name
  --batch-size 5          \   # chunks per API call (higher = fewer calls)
  --out output/           \   # output directory
  --analyze               \   # add 1 extra API call for document analysis block
  --db reg.db                 # also persist to SQLite (optional)
```

---

## 3. Input

### Accepted File Types

| Format | Notes |
|---|---|
| `.pdf` | Native text extraction via Docling + automatic OCR fallback for scanned PDFs |
| `.docx` | Microsoft Word — fully supported |
| `.pptx` | PowerPoint — supported |

### Calling from Python (e.g. from a FastAPI route)

```python
from pipeline import run

summary = run(
    input_path="uploads/circular.pdf",
    backend="groq",
    batch_size=5,
    output_dir="output/",
    run_analysis=False,   # True costs 1 extra API call
    db_path=""            # "" = skip SQLite
)

print(summary["json_output"])   # path to the output JSON file
print(summary["graph_output"])  # path to the graph JSON file
```

### `run()` Return Value

```python
{
  "document": "circular.pdf",
  "pages": 2,
  "chunks": 12,
  "candidates": 6,          # chunks that looked like obligations
  "obligations": 8,          # raw obligations before dedup
  "after_dedup": 7,          # after fuzzy deduplication
  "departments_affected": ["Compliance", "Operations"],
  "graph_nodes": 12,
  "graph_edges": 9,
  "json_output": "output/circular.json",
  "graph_output": "output/circular_graph.json"
}
```

---

## 4. Output

### 4.1 Rich JSON Document

**File:** `output/<stem>.json`

Top-level structure:

```json
{
  "doc_id": "RBI-RBI-2026-27-46",
  "source": "RBI",
  "title": "...",
  "circular_number": "RBI/2026-27/46",
  "reference_number": null,
  "date": "29 April 2026",
  "effective_date": "July 1, 2026",
  "issued_by": "Vaibhav Chaturvedi - Chief General Manager",
  "amends": "Reserve Bank of India (Commercial Banks...) Directions 2026",
  "language": "english",
  "total_pages": 2,

  "sections": [ ... ],        // Per-clause breakdown with nested obligations
  "tables": [],               // Reserved for future table extraction
  "annexures": [],            // Reserved
  "cross_references": [...],  // Unique references found across all obligations

  "obligations": [ ... ],     // FLAT list — same objects as in sections[].obligations
  "analysis": { ... },        // High-level document summary (populated if --analyze used)
  "validation": { ... }       // Heuristic quality checks on the extraction
}
```

### 4.2 Graph JSON

**File:** `output/<stem>_graph.json`

Standard D3 / Sigma.js **node-link** format:

```json
{
  "directed": true,
  "nodes": [
    { "id": "Circular:circular", "type": "Circular", "label": "circular" },
    { "id": "Domain:KYC/AML",    "type": "Domain",   "label": "KYC/AML" },
    { "id": "Dept:Compliance",   "type": "Department","label": "Compliance" },
    { "id": "Task:submit...",    "type": "Task",      "label": "submit...", "details": { ...full obligation dict... } },
    { "id": "Evidence:audit log","type": "Evidence",  "label": "audit log" }
  ],
  "links": [
    { "source": "Circular:circular", "target": "Domain:KYC/AML" },
    { "source": "Domain:KYC/AML",    "target": "Dept:Compliance" },
    { "source": "Dept:Compliance",   "target": "Task:submit..." },
    { "source": "Task:submit...",    "target": "Evidence:audit log" }
  ]
}
```

Graph hierarchy: **Circular → Domain → Department → Task → Evidence**

---

## 5. Full JSON Schema Reference

### Obligation Object

Every obligation — whether inside `sections[].obligations` or the flat `obligations[]` — has this shape:

```jsonc
{
  "id": "121A-OB4",                  // "<section>-OB<n>" — assigned by pipeline
  "section_id": "121A",              // Source section/clause number
  "clause_number": "121A",           // Same as section_id (redundant, kept for compatibility)
  "actor": "bank",                   // Who must act
  "action": "make arrangements to render banking services in affected areas",
  "obligation_type": "mandatory",    // "mandatory" | "discretionary"
  "trigger": "shall",                // Exact trigger word: "shall", "may", "must", etc.

  "deadline": {
    "text": "ongoing",               // Verbatim text; "None" if absent
    "absolute_date": null,           // ISO date "YYYY-MM-DD" or null
    "duration": null,                // e.g. "30 days" or null
    "urgency": "ongoing"             // "immediate"|"short_term"|"medium_term"|"long_term"|"ongoing"
  },

  "effective_date": "2026-07-01",    // Document-level effective date (inherited)
  "domain": "FinancialInclusion",    // One of the canonical domain list (see below)
  "departments": ["Operations", "Branch Network"],  // Internal bank departments
  "external_parties_referenced": ["Reserve Bank of India"],  // External bodies

  "severity": "high",                // "low"|"medium"|"high"|"critical"
  "severity_reason": "LLM Extracted", // "LLM Extracted" | "Regex extracted"
  "evidence_required": ["Branch service continuity note"],
  "penalty_if_missed": null,         // Stated penalty text or null
  "fine_exposure_inr": null,         // Numeric INR fine or null
  "cross_references": [],            // Other acts/circulars cited in this clause
  "confidence": 0.85,               // 0.0–1.0 LLM confidence in extraction
  "notes": null                      // Caveats or null
}
```

### Section Object

```jsonc
{
  "id": "121A",
  "heading": "A bank may operate their calamity affected branches from...",
  "text": "121A. A bank may operate...",   // Full raw clause text
  "page_number": 1,
  "clause_type": "obligation",            // "obligation"|"permission"|"effective_date"|"definition"|"other"
  "level": 1,
  "obligations": [ ... ]                  // Nested obligation objects
}
```

### Analysis Object (`--analyze` flag)

```jsonc
{
  "document_type": "guideline",
  "primary_actor": "Reserve Bank of India (RBI)",
  "secondary_actors": ["Department of Regulation"],
  "dominant_domains": ["banking regulations", "calamity relief measures"],
  "contains_quoted_regulations": false,
  "contains_enumerated_operational_clause": true,
  "likely_effective_date_text": "July 1, 2026",
  "core_obligation_phrases": ["A bank shall take immediate action..."],
  "analysis_confidence": 0.95,
  "reasoning": "Amendment direction issued by RBI..."
}
```

### Validation Object

```jsonc
{
  "missed_obligations": [],
  "incorrect_extractions": [
    {
      "obligation_id": "121C-OB11",
      "field": "action",
      "current_value": "Be opened by banks.",
      "correct_value": "Summarized action needed",
      "reason": "(VAL-006) Action text is too short..."
    }
  ],
  "missing_effective_date": null,
  "overall_confidence": 0.82,
  "validation_notes": "Heuristic checks passed..."
}
```

### Canonical Domain List

```
KYC/AML, Basel/Capital Adequacy, Cybersecurity, Data Privacy (DPDP),
FEMA/Forex, Priority Sector Lending, Grievance Redressal, Fraud Risk,
Interest Rate, Liquidity, Financial Inclusion, Business Continuity,
Payments & Settlement, Other
```

### Canonical Department List

```
Retail Banking, Corporate Banking, SME Banking, Agriculture/Rural Banking,
NRI Banking, Wealth Management, IT/Core Banking, Digital Banking,
Cybersecurity, Data & Analytics, Payments & Settlement, Compliance,
Risk Management, Internal Audit, Legal, AML/KYC, Fraud Management,
Treasury, Finance & Accounts, Taxation, HR, Operations, Customer Service,
Branch Network, Marketing, Financial Inclusion
```

---

## 6. Codebase Structure

```
reg-ingestion/
│
├── pipeline.py                     ← ENTRY POINT — run this
│
├── ingestion/
│   ├── extract/
│   │   ├── parser.py               ← Docling PDF→Section[] conversion
│   │   └── ocr_fallback.py         ← Auto OCR for scanned PDFs
│   │
│   ├── clauses/
│   │   └── chunker.py              ← Section[] → Chunk[] (clause splitting)
│   │
│   ├── obligations/
│   │   ├── schema.py               ← ALL Pydantic models (ObligationOutput, RichDocumentOutput, etc.)
│   │   └── extractor.py            ← LLM extraction — batched, regex doc context
│   │
│   ├── normalize/
│   │   └── normalizer.py           ← Fuzzy dept matching, dedup, deadline formatting
│   │
│   ├── graph/
│   │   └── builder.py              ← NetworkX graph builder + JSON exporter
│   │
│   ├── output/
│   │   └── formatter.py            ← Assembles RichDocumentOutput from all stages
│   │
│   ├── storage/
│   │   └── db.py                   ← Optional SQLite persistence
│   │
│   └── validate/
│       └── validator.py            ← Optional second-pass LLM validation (unused by default)
│
├── .env                            ← GROQ_API_KEY=gsk_...
├── requirements.txt
└── DEVELOPER_GUIDE.md              ← This file
```

---

## 7. Pipeline Stages — How Data Flows

```
Input File (PDF/DOCX)
        │
        ▼
[Stage 1] extract/parser.py
  parse_document(file) → List[Section]
  Section: { heading_path, page_number, raw_text, is_table }
        │
        ▼
[Stage 2] clauses/chunker.py
  chunk_sections(sections) → List[Chunk]
  Chunk: { section_id, raw_text, page_number, is_obligation_candidate }
  — Splits text by clause numbers (121A, 3.2.1, etc.)
  — Flags chunks containing shall/may/must etc.
        │
        ▼
[Stage 3] obligations/extractor.py      ← MAIN LLM STAGE
  extract_document_context()  → DocumentContext   (0 API calls — pure regex)
  extract_obligations_batch() → List[ObligationOutput]
  — Groups N chunks (default 5) per API call
  — Returns ObligationOutput objects with all fields populated
        │
        ▼
[Stage 4] normalize/normalizer.py
  normalize_obligations() → List[dict]
  — Fuzzy-matches department names to canonical list
  — Deduplicates near-identical obligations
  — Standardizes deadline format
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
[Stage 5a] output/formatter.py          [Stage 5b] graph/builder.py
  build_document_output()                 build_graph() → nx.DiGraph
  → RichDocumentOutput                    export_json() → dict
  — Groups obligations into sections
  — Assigns IDs (121A-OB4)
  — Runs heuristic validation
  — Optional LLM analysis call
        │                                          │
        ▼                                          ▼
  output/<name>.json                    output/<name>_graph.json
```

---

## 8. Key Files for Frontend Integration

### If you need to change the output JSON shape:
→ **`ingestion/obligations/schema.py`** — all Pydantic models live here.  
→ **`ingestion/output/formatter.py`** — assembles the final `RichDocumentOutput`.

### If you need to change what fields the LLM extracts:
→ **`ingestion/obligations/extractor.py`** — `_build_system_prompt()` controls the LLM prompt.

### If you need to add/remove canonical departments or domains:
→ **`ingestion/obligations/schema.py`** — `DEPARTMENTS` and `DOMAINS` lists at the top.

### If you need the pipeline callable as a function (not CLI):
→ **`pipeline.py`** — the `run()` function is already importable:
```python
from pipeline import run
result = run(input_path="file.pdf", backend="groq")
```

### If you need file upload support (e.g. FastAPI):
→ Save the uploaded file to a temp path, call `run()`, return both output paths.

---

## 9. Common Frontend Integration Tweaks

### A. Return JSON as API response instead of writing to disk

In `pipeline.py`, replace the file write block:
```python
# After: rich_doc = build_document_output(...)
# Instead of writing to disk, return the dict directly:
return rich_doc.model_dump()
```

### B. Stream progress to the frontend (SSE / WebSocket)

Replace `logger.info(...)` calls in `pipeline.py` with your streaming emitter:
```python
# Example with FastAPI SSE:
yield f"data: Stage 3 complete — {len(raw_obligations)} obligations\n\n"
```

### C. Add a new field to every obligation

In `ingestion/obligations/schema.py`, add to `ObligationOutput`:
```python
priority_score: float = 0.0   # your computed field
```
Then populate it in `ingestion/output/formatter.py` inside `build_document_output()`.

### D. Filter obligations by severity or department

After `normalize_obligations()` in `pipeline.py`:
```python
normalized = [o for o in normalized if o.get("severity") in ("high", "critical")]
```

### E. Change the obligation ID format

In `ingestion/output/formatter.py`, change `_next_ob_id()`:
```python
def _next_ob_id(section_id: str) -> str:
    global _ob_counter
    _ob_counter += 1
    return f"OBL-{_ob_counter:04d}"   # e.g. OBL-0001, OBL-0002
```

### F. Accept file bytes (for multipart upload) instead of a path

In `ingestion/extract/parser.py`, `parse_document()` accepts any `Path`.  
Save bytes to a temp file:
```python
import tempfile, shutil
with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
    shutil.copyfileobj(upload.file, tmp)
    tmp_path = tmp.name
result = run(input_path=tmp_path, ...)
```

---

## 10. Environment & Configuration

### `.env` file

```env
GROQ_API_KEY=gsk_your_key_here
```

### Backends

| Backend | Model | When to use |
|---|---|---|
| `groq` | `llama-3.3-70b-versatile` | Production — fast, accurate, free tier: 100K tokens/day |
| `ollama` | `phi3` (default), `mistral`, `llama3` | Local / offline — slower, phi3 is weak, use mistral |

### Switching model at runtime

```bash
python pipeline.py file.pdf --backend ollama --model mistral
python pipeline.py file.pdf --backend groq   --model llama-3.3-70b-versatile
```

### Rate limits (Groq free tier)

- **100,000 tokens/day** hard cap
- A typical 2-page RBI circular uses ~6,000–10,000 tokens total (2 API calls)
- A 20-page circular uses ~40,000–60,000 tokens (~8–10 API calls)
- Use `--batch-size 10` to send more chunks per call and reduce overhead

---

## 11. API Call Budget

| What | Calls | Notes |
|---|---|---|
| Document context (title, date, circular no.) | **0** | Pure regex — no LLM needed |
| Obligation extraction | **⌈candidates / batch_size⌉** | Default batch_size=5; 6 candidates = 2 calls |
| Document analysis | **0** (default) or **1** | Add `--analyze` flag to enable |
| Second-pass validation | **0** (default) | Was removed from default flow |
| **Typical 2-page circular** | **2 calls** | |
| **Typical 10-page circular** | **4–6 calls** | Depending on obligation density |

---

## Appendix — Data Types Quick Reference

| Field | Type | Values |
|---|---|---|
| `obligation_type` | string | `"mandatory"` \| `"discretionary"` |
| `trigger` | string | `"shall"`, `"may"`, `"must"`, `"is required to"`, etc. |
| `severity` | string | `"low"` \| `"medium"` \| `"high"` \| `"critical"` |
| `deadline.urgency` | string | `"immediate"` \| `"short_term"` \| `"medium_term"` \| `"long_term"` \| `"ongoing"` |
| `clause_type` | string | `"obligation"` \| `"permission"` \| `"effective_date"` \| `"definition"` \| `"other"` |
| `confidence` | float | `0.0` – `1.0` |
| `fine_exposure_inr` | float \| null | INR amount or `null` |
| `departments` | string[] | Subset of canonical department list |
| `domain` | string | One of canonical domain list |
