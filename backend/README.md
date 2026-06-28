# reg-ingestion

A production-grade regulatory document ingestion pipeline for Indian banking compliance. Processes RBI circulars, directions, and regulatory PDFs into structured, queryable obligations — extracting actors, actions, deadlines, departments, domains, and evidence requirements using LLMs.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Pipeline](#running-the-pipeline)
- [Viewing the Output](#viewing-the-output)
- [Module Reference](#module-reference)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
PDF / DOCX / PPTX
        │
        ▼
┌──────────────────┐
│  1. extract/     │  Docling parser + PyMuPDF OCR fallback
│     parser.py    │  → list[Section]
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. clauses/     │  Clause-level chunking on numbered patterns
│     chunker.py   │  → list[Chunk] with real clause IDs + pre-filter flag
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  3. obligations/                         │
│     extractor.py                         │
│     ├── extract_document_context()  ─── one LLM call per doc (title, date, authority)
│     └── extract_obligations_batch() ─── one LLM call per obligation-candidate chunk
│          → list[Obligation]             (multiple obligations per chunk supported)
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  4. normalize/   │  Fuzzy dept matching (rapidfuzz) + dedup + deadline format
│     normalizer.py│  → list[dict]
└────────┬─────────┘
         │
         ▼ (optional --validate flag)
┌──────────────────┐
│  5. validate/    │  Second-pass LLM check: flags missing conditions/exceptions
│     validator.py │  → adds review_flag to obligations needing human review
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  6. graph/       │  NetworkX directed graph:
│     builder.py   │  Circular → Domain → Department → Task → Evidence
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  7. storage/     │  SQLite persistence (sqlite-utils)
│     db.py        │  Tables: documents, obligations, tasks
└──────────────────┘
```

---

## Directory Structure

```
reg-ingestion/
├── ingestion/
│   ├── extract/
│   │   ├── parser.py          # Docling-based extractor with NeedsOCR exception
│   │   └── ocr_fallback.py    # PyMuPDF rasterization + PaddleOCR/Tesseract
│   ├── clauses/
│   │   └── chunker.py         # Clause splitter, orphan merging, obligation pre-filter
│   ├── obligations/
│   │   ├── schema.py          # Pydantic models: Obligation, DocumentContext
│   │   └── extractor.py       # LLM extraction via instructor (Groq / Ollama)
│   ├── normalize/
│   │   └── normalizer.py      # Fuzzy dept matching, dedup, deadline standardization
│   ├── validate/
│   │   └── validator.py       # Optional second-pass LLM validation
│   ├── graph/
│   │   └── builder.py         # NetworkX graph builder + query + JSON export
│   └── storage/
│       └── db.py              # SQLite persistence and task management
├── pipeline.py                # End-to-end CLI entry point
├── view_db.py                 # Terminal viewer for the SQLite database
├── run_groq_test.py           # Quick single-chunk Groq API test
├── tests/
│   ├── test_parser.py
│   ├── test_chunker.py
│   ├── test_extractor.py
│   ├── test_normalizer.py
│   ├── test_validator.py
│   ├── test_builder.py
│   ├── test_db.py
│   └── test_pipeline.py       # Full integration test (mocked LLM)
├── .env                       # API keys (never commit this)
├── requirements.txt
└── README.md
```

---

## Prerequisites

- **Python 3.12+**
- **Windows Developer Mode** enabled (required for HuggingFace model symlinks)
  - Settings → Privacy & Security → For Developers → Developer Mode: **ON**
- A **Groq API key** (free at [console.groq.com](https://console.groq.com)) OR a local **Ollama** installation

---

## Installation

```powershell
# 1. Clone / navigate to the project
cd reg-ingestion

# 2. Create and activate virtualenv
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install all dependencies
pip install -r requirements.txt
```

---

## Configuration

Edit `.env` in the project root:

```env
# Required for Groq backend
GROQ_API_KEY="your_groq_api_key_here"

# Prevents HuggingFace from needing admin symlinks (Windows)
HF_HUB_DISABLE_SYMLINKS="1"
```

Get a free Groq API key at [console.groq.com](https://console.groq.com). The free tier is sufficient for hundreds of circulars.

---

## Running the Pipeline

### Basic run (Groq backend, no validation)

```powershell
python pipeline.py path/to/circular.pdf --backend groq
```

### With optional second-pass validation

```powershell
python pipeline.py path/to/circular.pdf --backend groq --validate
```

### Using local Ollama instead of Groq

```powershell
# First, start Ollama and pull a model
ollama pull phi3

python pipeline.py path/to/circular.pdf --backend ollama
```

### Custom database path

```powershell
python pipeline.py path/to/circular.pdf --backend groq --db my_obligations.db
```

### Pipeline output

The pipeline prints a live log for each stage and a summary table at the end:

```
10:31:02 [INFO] pipeline - [1/7] Extracting document: RBI_Circular.pdf
10:31:08 [INFO] pipeline -       → 84 sections across 12 pages
10:31:08 [INFO] pipeline - [2/7] Chunking sections into clause-level chunks
10:31:08 [INFO] pipeline -       → 147 chunks | 62 obligation candidates | 85 skipped
10:31:09 [INFO] pipeline - [3/7] Extracting obligations via LLM (backend=groq)
10:31:09 [INFO] pipeline -       → Extracting document-level context...
...

════════════════════════════════════════════════════════════
  PIPELINE SUMMARY
════════════════════════════════════════════════════════════
  Document        : RBI_Circular.pdf
  Backend         : groq
  Pages processed : 12
  Chunks found    : 147
  LLM candidates  : 62
  Obligations     : 28
  Flagged review  : 4 (14.3%)
  Depts affected  : 5
    • Compliance
    • Finance & Accounts
    • Internal Audit
    • Operations
    • Risk Management
  Graph           : 67 nodes, 61 edges
════════════════════════════════════════════════════════════
```

---

## Viewing the Output

### Terminal viewer

```powershell
# Full summary of all tables
python view_db.py

# Show all extracted obligations (formatted)
python view_db.py --table obligations

# Show all tasks with status icons
python view_db.py --table tasks

# Show pending tasks for a specific department
python view_db.py --dept "Compliance"
python view_db.py --dept "Finance & Accounts"

# Export obligations to JSON
python view_db.py --export obligations_output.json

# Use a non-default database file
python view_db.py --db my_obligations.db --table obligations
```

### SQLite GUI

Open `reg_ingestion.db` directly in [DB Browser for SQLite](https://sqlitebrowser.org/) for a visual table view and SQL query editor.

### JSON structure

Each obligation in the database / exported JSON looks like:

```json
{
  "id": 11,
  "document_id": 2,
  "actor": "bank",
  "action": "include interim net profits in Tier I capital after deducting applicable taxes and proposed dividends",
  "deadline": null,
  "effective_date": "April 1, 2026",
  "mandatory": true,
  "domain": "Basel/Capital Adequacy",
  "department": ["Finance & Accounts"],
  "external_parties_referenced": ["Reserve Bank of India"],
  "evidence_required": ["audited financial statements"],
  "severity": "high",
  "source_section": "3.2.1",
  "source_page": 4,
  "review_flag": null,
  "status": "pending"
}
```

### Task management via code

```python
from ingestion.storage.db import get_pending_tasks, mark_task_complete

# Get all tasks for a department
tasks = get_pending_tasks("reg_ingestion.db", "Compliance")

# Mark a task done with evidence
mark_task_complete("reg_ingestion.db", task_id=3, evidence="compliance_report_Q1.pdf")
```

---

## Module Reference

| Module | Key function | Purpose |
|--------|-------------|---------|
| `extract/parser.py` | `parse_document(path)` | Extracts sections from PDF/DOCX/PPTX using Docling |
| `extract/ocr_fallback.py` | `ocr_document(path)` | Rasterizes + OCRs scanned PDFs via PyMuPDF + PaddleOCR |
| `clauses/chunker.py` | `chunk_sections(sections)` | Splits sections into clause chunks; flags obligation candidates |
| `clauses/chunker.py` | `looks_like_obligation(text)` | Pre-filter: detects mandatory + permissive obligation language |
| `obligations/schema.py` | `Obligation`, `DocumentContext` | Pydantic models with constrained `domain` and `department` Literals |
| `obligations/extractor.py` | `extract_document_context(sections, backend)` | One-per-doc LLM call: title, effective date, issuing authority |
| `obligations/extractor.py` | `extract_obligation(chunk, backend, doc_context)` | Per-chunk LLM call → `list[Obligation]` |
| `obligations/extractor.py` | `extract_obligations_batch(chunks, backend, doc_context)` | Batch wrapper with skip logging |
| `normalize/normalizer.py` | `normalize_obligations(obligations)` | Fuzzy dept matching, dedup, deadline standardization |
| `validate/validator.py` | `validate_obligations(obligations, clause_texts, backend)` | Second-pass LLM gap detection; adds `review_flag` |
| `graph/builder.py` | `build_graph(obligations, doc_name)` | Builds NetworkX DiGraph |
| `graph/builder.py` | `query_by_department(graph, dept)` | Returns tasks for a department |
| `graph/builder.py` | `query_by_domain(graph, domain)` | Returns departments affected by a domain |
| `graph/builder.py` | `export_json(graph)` | Exports node-link JSON for D3.js / Sigma.js |
| `storage/db.py` | `save_document(db_path, filename)` | Registers a document, returns `document_id` |
| `storage/db.py` | `save_obligations(db_path, doc_id, obligations)` | Persists obligations + auto-creates per-dept tasks |
| `storage/db.py` | `get_pending_tasks(db_path, department)` | Queries pending tasks for a department |
| `storage/db.py` | `mark_task_complete(db_path, task_id, evidence)` | Marks task done; auto-completes obligation if all depts done |

---

## Supported Obligation Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `actor` | `str` | Who must act (e.g. `"bank"`, `"board of directors"`) |
| `action` | `str` | Full, self-contained action statement |
| `deadline` | `str \| null` | Time limit stated in the clause itself |
| `effective_date` | `str \| null` | Document-level effective date |
| `mandatory` | `bool` | `true` = must/shall, `false` = may/can/permitted |
| `domain` | `Literal[...]` | One of 14 controlled regulatory domains |
| `department` | `list[Literal[...]]` | Internal bank departments responsible |
| `external_parties_referenced` | `list[str]` | Regulators/external bodies mentioned in clause |
| `evidence_required` | `list[str]` | Documents the bank must produce as proof |
| `severity` | `"low"\|"medium"\|"high"\|"critical"` | Obligation severity |
| `source_section` | `str` | Clause ID (e.g. `"3.2.1"`, `"Para 4"`) or UUID fallback |
| `source_page` | `int` | Page number in the source document |

### Controlled Vocabularies

**Domains** (14):
`KYC/AML`, `Basel/Capital Adequacy`, `Cybersecurity`, `Data Privacy (DPDP)`, `FEMA/Forex`, `Priority Sector Lending`, `Grievance Redressal`, `Fraud Risk`, `Interest Rate`, `Liquidity`, `Financial Inclusion`, `Business Continuity`, `Payments & Settlement`, `Other`

**Departments** (25):
`Retail Banking`, `Corporate Banking`, `SME Banking`, `Agriculture/Rural Banking`, `NRI Banking`, `Wealth Management`, `IT/Core Banking`, `Digital Banking`, `Cybersecurity`, `Data & Analytics`, `Payments & Settlement`, `Compliance`, `Risk Management`, `Internal Audit`, `Legal`, `AML/KYC`, `Fraud Management`, `Treasury`, `Finance & Accounts`, `Taxation`, `HR`, `Operations`, `Customer Service`, `Branch Network`, `Marketing`

---

## Running Tests

```powershell
# Run all tests
pytest

# Run a specific test file
pytest tests/test_chunker.py -v

# Run the full integration test (mocks LLM, no API key needed)
pytest tests/test_pipeline.py -v

# Run with console output
pytest tests/test_normalizer.py -s
```

---

## Troubleshooting

### `OSError: [WinError 1314] A required privilege is not held by the client`
HuggingFace model cache requires symlinks on Windows.
**Fix:** Enable Windows Developer Mode → Settings → Privacy & Security → For Developers → ON

### `GROQ_API_KEY not set` / `401 Unauthorized`
**Fix:** Ensure your `.env` file has the correct key and `load_dotenv()` is called before the API client is created.

### `Error code: 400 — tool call validation failed`
The LLM returned `null` for a non-nullable schema field.
**Fix:** This was fixed in the prompt. Make sure you're running the latest version of `extractor.py`.

### Obligations show vague actions like `"implement"` or `"calculate"`
**Fix:** Already patched — the prompt now requires a complete verb + object + qualifier.

### `deadline: "None"` instead of `null` in the database
**Fix:** Already patched in `normalizer.py` — strings `"none"`, `"null"`, `"unknown"` are all treated as `null`.

### No obligations extracted from a valid regulatory document
Check if the chunks were pre-filtered out. Run with logging to see:
```powershell
python -c "
import logging; logging.basicConfig(level=logging.DEBUG)
from pipeline import run_pipeline
run_pipeline('your_file.pdf', backend='groq', db_path='test.db')
"
```
