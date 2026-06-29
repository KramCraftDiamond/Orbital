"""
api.py - FastAPI server wrapping the ORBITAL ingestion pipeline.

Run from the backend directory:
    uvicorn api:app --reload --port 8000

Or from the repository root:
    uvicorn backend.api:app --reload --port 8000
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import traceback
import uuid
import hashlib
import html as html_lib
import re
import sqlite3
import threading
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")
load_dotenv()

UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "output"
EVIDENCE_DIR = BASE_DIR / "evidence_uploads"
DB_PATH = Path(os.environ.get("DB_PATH", BASE_DIR / "orbital.db"))
ALLOWED_SUFFIXES = {".pdf", ".docx", ".pptx"}
ALLOWED_EVIDENCE_SUFFIXES = {".pdf", ".docx", ".txt", ".md", ".csv", ".log", ".png", ".jpg", ".jpeg"}
DOCUMENT_LINK_SUFFIXES = (".pdf", ".docx", ".pptx")
NEGATIVE_EVIDENCE_TERMS = (
    "not available",
    "not enabled",
    "not implemented",
    "pending",
    "missing",
    "without approval",
    "cannot confirm",
    "no screenshot",
    "not completed",
)
REGULATOR_SOURCES = [
    {"regulator": "RBI", "url": "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx"},
    {"regulator": "SEBI", "url": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7&smid=0"},
    {"regulator": "NPCI", "url": "https://www.npci.org.in/what-we-do/upi/circular"},
    {"regulator": "CERT-In", "url": "https://www.cert-in.org.in/"},
    {"regulator": "IRDAI", "url": "https://irdai.gov.in/document-detail"},
]

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ORBITAL API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict[str, Any]] = {}
AUDIT_EVENTS: list[dict[str, Any]] = []
EVIDENCE_RESULTS: dict[str, list[dict[str, Any]]] = {}
RUNTIME_DB_READY = False
MONITOR_THREAD_STARTED = False
MONITOR_INTERVAL_SECONDS = int(os.environ.get("MONITOR_INTERVAL_SECONDS", "3600"))


@app.on_event("startup")
def load_persistent_runtime_state() -> None:
    initialize_runtime_state()
    start_regulator_monitor()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/regulators/check")
def check_regulators(source_url: str = Form(default="")) -> dict[str, Any]:
    return run_regulator_check(source_url)


def run_regulator_check(source_url: str = "") -> dict[str, Any]:
    sources = [{"regulator": "Manual source", "url": source_url.strip()}] if source_url.strip() else REGULATOR_SOURCES
    findings: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for source in sources:
        try:
            links = discover_document_links(source["regulator"], source["url"])
        except Exception as exc:
            errors.append({"regulator": source["regulator"], "url": source["url"], "error": str(exc)})
            continue

        for link in links:
            previous = get_seen_regulator_link(link["url"])
            status = "new"
            if previous:
                status = "changed" if previous.get("checksum") != link["checksum"] else "seen"
            save_regulator_link(link)
            findings.append({**link, "status": status})

        append_audit_event(
            entity_type="System",
            entity_id=source["regulator"],
            action="Regulator source checked",
            actor="ORBITAL Monitor",
            details=f"{source['url']} yielded {len(links)} document link(s).",
        )

    return {
        "checkedAt": datetime.utcnow().isoformat() + "Z",
        "sourcesChecked": len(sources),
        "newCount": sum(1 for item in findings if item["status"] == "new"),
        "changedCount": sum(1 for item in findings if item["status"] == "changed"),
        "findings": findings,
        "errors": errors,
    }


@app.post("/api/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    backend: str = Form(default_factory=lambda: os.environ.get("LLM_BACKEND", "groq")),
    model: str = Form(default=""),
    batch_size: int = Form(default=5),
    run_analysis: bool = Form(default=False),
) -> dict[str, Any]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and PPTX files are supported.")

    if backend not in {"groq", "ollama"}:
        raise HTTPException(status_code=400, detail="backend must be 'groq' or 'ollama'.")

    if backend == "groq" and not os.environ.get("GROQ_API_KEY"):
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is required when backend='groq'.")

    job_id = uuid.uuid4().hex
    job_dir = OUTPUT_DIR / job_id
    upload_path = UPLOAD_DIR / f"{job_id}{suffix}"
    job_dir.mkdir(parents=True, exist_ok=True)

    with upload_path.open("wb") as out_file:
        shutil.copyfileobj(file.file, out_file)

    JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "filename": file.filename,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "summary": None,
        "error": None,
    }
    persist_job(JOBS[job_id])
    append_audit_event(
        entity_type="Circular",
        entity_id=job_id,
        action="Document uploaded",
        actor="ORBITAL Intake",
        details=f"{file.filename} accepted for backend processing.",
    )

    background_tasks.add_task(
        run_pipeline_job,
        job_id=job_id,
        input_path=str(upload_path),
        output_dir=str(job_dir),
        backend=backend,
        model=model,
        batch_size=batch_size,
        run_analysis=run_analysis,
    )

    return {"job_id": job_id, "status": "queued", "filename": file.filename}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    return require_job(job_id)


@app.get("/api/documents/{job_id}")
def get_document(job_id: str) -> dict[str, Any]:
    require_complete_job(job_id)
    return read_job_json(job_id)


@app.get("/api/documents/{job_id}/graph")
def get_graph(job_id: str) -> dict[str, Any]:
    require_complete_job(job_id)
    graph_path = get_job_artifact(job_id, "graph_output")
    return read_json_file(graph_path)


@app.get("/api/documents/{job_id}/obligations")
def get_obligations(job_id: str) -> dict[str, Any]:
    document = get_document(job_id)
    return {
        "job_id": job_id,
        "document": document_summary(document),
        "obligations": document.get("obligations", []),
        "validation": document.get("validation", {}),
    }


@app.get("/api/documents/{job_id}/map-cards")
def get_map_cards(job_id: str) -> dict[str, Any]:
    document = get_document(job_id)
    obligations = document.get("obligations", [])
    return {
        "job_id": job_id,
        "document": document_summary(document),
        "map_cards": [to_map_card(document, obligation, index) for index, obligation in enumerate(obligations)],
    }


@app.post("/api/map-cards/{map_id}/evidence/upload")
async def upload_evidence(map_id: str, file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EVIDENCE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Evidence file type is not supported.")

    card = find_map_card(map_id)
    if not card:
        raise HTTPException(status_code=404, detail="MAP card not found. Generate MAP cards before uploading evidence.")

    evidence_id = f"EV-{uuid.uuid4().hex[:10].upper()}"
    evidence_path = EVIDENCE_DIR / f"{evidence_id}{suffix}"
    with evidence_path.open("wb") as out_file:
        shutil.copyfileobj(file.file, out_file)

    evidence_text = extract_evidence_text(evidence_path)
    requirements = card.get("validationChecklist") or card.get("evidenceRequired") or []
    matched, missing, contradicted, snippets = validate_evidence(requirements, evidence_text)
    result_label = evidence_result_label(matched, missing, contradicted)
    result = {
        "id": evidence_id,
        "mapCardId": map_id,
        "fileName": file.filename,
        "uploadedBy": "Department user",
        "uploadedAt": datetime.utcnow().isoformat() + "Z",
        "validationResult": result_label,
        "matchedRequirements": matched,
        "missingRequirements": missing,
        "contradictedRequirements": contradicted,
        "sourceSnippets": snippets,
        "recommendation": evidence_recommendation(result_label, missing, contradicted),
        "requiresHumanReview": True,
    }
    EVIDENCE_RESULTS.setdefault(map_id, []).append(result)
    persist_evidence_result(map_id, result)
    append_audit_event(
        entity_type="Evidence",
        entity_id=evidence_id,
        action="Evidence uploaded and validated",
        actor="ORBITAL Evidence Agent",
        details=f"{file.filename} checked against {len(requirements)} MAP card requirement(s); result={result_label}.",
        severity=card.get("severity"),
    )
    return result


@app.get("/api/map-cards/{map_id}/evidence")
def get_evidence(map_id: str) -> dict[str, Any]:
    return {"mapCardId": map_id, "evidence": EVIDENCE_RESULTS.get(map_id, [])}


@app.get("/api/tasks")
def get_tasks(department: str = "") -> dict[str, Any]:
    tasks = list_tasks(department.strip() or None)
    return {"tasks": tasks, "total": len(tasks)}


@app.patch("/api/tasks/{task_id}/complete")
def complete_task(task_id: int, evidence_id: str = Form(default="")) -> dict[str, Any]:
    task = mark_task_complete_runtime(task_id, evidence_id or "Human-approved evidence")
    append_audit_event(
        entity_type="Approval",
        entity_id=str(task_id),
        action="Task completed",
        actor="Compliance reviewer",
        details=f"Task {task_id} completed with evidence reference {evidence_id or 'manual approval'}.",
        severity=task.get("severity"),
    )
    return {"task": task}


@app.patch("/api/map-cards/{map_id}/close")
def close_map_card(map_id: str, evidence_id: str = Form(default="")) -> dict[str, Any]:
    card = find_map_card(map_id)
    if not card:
        raise HTTPException(status_code=404, detail="MAP card not found.")

    completed_tasks = close_tasks_for_map_card(card, evidence_id or "Human-approved MAP closure")
    append_audit_event(
        entity_type="MAPCard",
        entity_id=map_id,
        action="MAP card closed",
        actor="Compliance reviewer",
        details=f"Closed {len(completed_tasks)} task(s) for {map_id} with evidence reference {evidence_id or 'manual approval'}.",
        severity=card.get("severity"),
    )
    return {"mapCardId": map_id, "status": "Closed", "completedTasks": completed_tasks}


@app.get("/api/audit/events")
def get_audit_events() -> dict[str, Any]:
    return {"events": AUDIT_EVENTS, "verified": verify_audit_chain()}


@app.get("/api/circulars")
def list_circulars() -> dict[str, Any]:
    circulars = []
    for job in JOBS.values():
        if job.get("status") != "completed":
            continue
        try:
            circulars.append(document_summary(read_job_json(job["job_id"])) | {"job_id": job["job_id"]})
        except FileNotFoundError:
            continue
    return {"circulars": circulars}


def run_pipeline_job(
    job_id: str,
    input_path: str,
    output_dir: str,
    backend: str,
    model: str,
    batch_size: int,
    run_analysis: bool,
) -> None:
    update_job(job_id, status="running")
    try:
        from pipeline import run

        summary = run(
            input_path=input_path,
            backend=backend,
            model=model,
            batch_size=batch_size,
            output_dir=output_dir,
            run_analysis=run_analysis,
            db_path=str(DB_PATH),
        )
        append_audit_event(
            entity_type="Circular",
            entity_id=job_id,
            action="Pipeline completed",
            actor="ORBITAL Pipeline",
            details=(
                f"Extracted {summary.get('obligations', 0)} obligation(s), "
                f"{summary.get('after_dedup', 0)} after deduplication."
            ),
        )
        update_job(job_id, status="completed", summary=summary)
    except Exception as exc:
        append_audit_event(
            entity_type="System",
            entity_id=job_id,
            action="Pipeline failed",
            actor="ORBITAL Pipeline",
            details=str(exc),
            severity="high",
        )
        update_job(job_id, status="failed", error=str(exc), traceback=traceback.format_exc())


def require_job(job_id: str) -> dict[str, Any]:
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def require_complete_job(job_id: str) -> dict[str, Any]:
    job = require_job(job_id)
    if job.get("status") == "failed":
        raise HTTPException(status_code=500, detail=job.get("error") or "Pipeline job failed.")
    if job.get("status") != "completed":
        raise HTTPException(status_code=409, detail=f"Job is {job.get('status')}.")
    return job


def update_job(job_id: str, **updates: Any) -> None:
    JOBS[job_id].update(updates)
    JOBS[job_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"
    persist_job(JOBS[job_id])


def get_job_artifact(job_id: str, key: str) -> Path:
    job = require_complete_job(job_id)
    summary = job.get("summary") or {}
    path = summary.get(key)
    if not path:
        raise HTTPException(status_code=404, detail=f"{key} not found for job.")
    return Path(path)


def read_job_json(job_id: str) -> dict[str, Any]:
    return read_json_file(get_job_artifact(job_id, "json_output"))


def read_json_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(path)
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def document_summary(document: dict[str, Any]) -> dict[str, Any]:
    obligations = document.get("obligations", [])
    high_risk = [item for item in obligations if item.get("severity") in {"high", "critical"}]
    validation = document.get("validation") or {}
    return {
        "doc_id": document.get("doc_id"),
        "source": document.get("source"),
        "title": document.get("title"),
        "circular_number": document.get("circular_number"),
        "date": document.get("date"),
        "effective_date": document.get("effective_date"),
        "total_pages": document.get("total_pages", 0),
        "total_obligations": len(obligations),
        "high_risk_count": len(high_risk),
        "validation": validation,
    }


def to_map_card(document: dict[str, Any], obligation: dict[str, Any], index: int) -> dict[str, Any]:
    obligation_id = obligation.get("id") or f"OBL-{index + 1:04d}"
    action = obligation.get("action") or "Review regulatory obligation"
    departments = obligation.get("departments") or obligation.get("department") or ["Compliance"]
    evidence = obligation.get("evidence_required") or ["Compliance sign-off record"]
    deadline = obligation.get("deadline") or {}
    deadline_text = deadline.get("absolute_date") or deadline.get("text") if isinstance(deadline, dict) else deadline

    owner_department = departments[0] if departments else "Compliance"
    reviewer_department = "Internal Audit" if "Internal Audit" not in departments else "Compliance"
    action_verb = action.strip().split(" ", 1)[0].capitalize() if action.strip() else "Review"
    acceptance_criteria = [
        f"Accountable department confirms completion of: {action}",
        f"Evidence references source clause {obligation.get('clause_number') or obligation.get('section_id') or 'N/A'}.",
        "Authorized compliance reviewer records final approval before closure.",
    ]
    evidence_rules = [
        make_validation_rule(item) for item in evidence
    ] or ["Evidence must be readable, attributable to the assigned department, and tied to the MAP card."]

    return {
        "id": f"MAP-{obligation_id}",
        "obligationId": obligation_id,
        "title": make_title(action),
        "summary": action,
        "sourceRegulator": document.get("source") or "RBI",
        "circularTitle": document.get("title") or "Uploaded circular",
        "sourceClause": obligation.get("clause_number") or obligation.get("section_id") or "N/A",
        "assignedDepartments": departments,
        "owner": owner_department,
        "severity": obligation.get("severity") or "medium",
        "deadline": deadline_text or document.get("effective_date") or "Not specified",
        "status": "New",
        "evidenceRequired": evidence,
        "aiReasoning": obligation.get("severity_reason") or "Generated from validated obligation extraction.",
        "validationChecklist": evidence_rules,
        "actionVerb": action_verb,
        "measurableOutcome": f"{owner_department} completes the control action and supplies evidence that satisfies reviewer checks.",
        "acceptanceCriteria": acceptance_criteria,
        "evidenceValidationRules": evidence_rules,
        "ownerDepartment": owner_department,
        "reviewerDepartment": reviewer_department,
        "deadlineType": "explicit" if deadline_text else "derived_or_missing",
        "escalationLevel": "L2" if obligation.get("severity") in {"high", "critical"} else "L1",
        "closurePolicy": "AI may recommend closure, but a human compliance reviewer must approve final status.",
    }


def make_title(action: str) -> str:
    words = action.strip().split()
    if not words:
        return "Review regulatory obligation"
    title = " ".join(words[:10]).strip()
    return title[0].upper() + title[1:]


def make_validation_rule(evidence_item: str) -> str:
    item = str(evidence_item).strip()
    if not item:
        return "Evidence item must be provided and tied to this MAP card."
    return f"Evidence must contain readable proof for: {item}."


def find_map_card(map_id: str) -> dict[str, Any] | None:
    for job in JOBS.values():
        if job.get("status") != "completed":
            continue
        try:
            document = read_job_json(job["job_id"])
        except FileNotFoundError:
            continue
        for index, obligation in enumerate(document.get("obligations", [])):
            card = to_map_card(document, obligation, index)
            if card["id"] == map_id:
                return card
    return None


def extract_evidence_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        try:
            import fitz

            with fitz.open(path) as doc:
                return "\n".join(page.get_text() for page in doc)
        except Exception:
            return path.read_bytes().decode("utf-8", errors="ignore")
    if suffix == ".docx":
        try:
            with zipfile.ZipFile(path) as archive:
                xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
                return re.sub(r"<[^>]+>", " ", xml)
        except Exception:
            return path.read_bytes().decode("utf-8", errors="ignore")
    return path.read_bytes().decode("utf-8", errors="ignore")


def validate_evidence(requirements: list[str], evidence_text: str) -> tuple[list[str], list[str], list[str], list[dict[str, str]]]:
    text = evidence_text.lower()
    matched: list[str] = []
    missing: list[str] = []
    contradicted: list[str] = []
    snippets: list[dict[str, str]] = []
    for requirement in requirements:
        keywords = extract_keywords(requirement)
        hits = sum(1 for keyword in keywords if keyword in text)
        if keywords and hits >= max(1, min(3, len(keywords)) // 2):
            snippet = find_evidence_snippet(evidence_text, keywords)
            if has_contradiction(snippet):
                contradicted.append(requirement)
                status = "contradicted"
            else:
                matched.append(requirement)
                status = "matched"
            snippets.append({"requirement": requirement, "snippet": snippet, "status": status})
        else:
            missing.append(requirement)
    return matched, missing, contradicted, snippets


def extract_keywords(value: str) -> list[str]:
    stopwords = {
        "the", "and", "for", "with", "must", "contain", "readable", "proof", "evidence",
        "provide", "provided", "this", "that", "from", "against", "card", "map",
    }
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9/-]{3,}", value.lower())
    return [word for word in words if word not in stopwords][:8]


def find_evidence_snippet(evidence_text: str, keywords: list[str]) -> str:
    lowered = evidence_text.lower()
    positions = [lowered.find(keyword) for keyword in keywords if lowered.find(keyword) >= 0]
    if not positions:
        return ""
    start = max(0, min(positions) - 120)
    end = min(len(evidence_text), min(positions) + 260)
    return re.sub(r"\s+", " ", evidence_text[start:end]).strip()


def has_contradiction(snippet: str) -> bool:
    lowered = snippet.lower()
    return any(term in lowered for term in NEGATIVE_EVIDENCE_TERMS)


def evidence_result_label(matched: list[str], missing: list[str], contradicted: list[str]) -> str:
    if contradicted:
        return "Human Review Required"
    if matched and not missing:
        return "Pass"
    if matched and missing:
        return "Partial"
    return "Human Review Required"


def evidence_recommendation(result_label: str, missing: list[str], contradicted: list[str]) -> str:
    if contradicted:
        return f"Evidence contains possible contradiction language for {len(contradicted)} requirement(s). Human review is required."
    if result_label == "Pass":
        return "Evidence satisfies the automated checklist. Route to human reviewer for final closure."
    if result_label == "Partial":
        return f"Request supplementary evidence for {len(missing)} missing requirement(s) before approval."
    return "Automated validation could not confirm the checklist. Human review and revised evidence are required."


def append_audit_event(
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str,
    details: str,
    severity: str | None = None,
) -> dict[str, Any]:
    previous_hash = AUDIT_EVENTS[-1]["eventHash"] if AUDIT_EVENTS else "GENESIS"
    timestamp = datetime.utcnow().isoformat() + "Z"
    event_id = f"AUD-{len(AUDIT_EVENTS) + 1:06d}"
    payload = f"{previous_hash}|{timestamp}|{actor}|{action}|{entity_id}|{details}"
    event_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    event = {
        "id": event_id,
        "entityType": entity_type,
        "entityId": entity_id,
        "action": action,
        "actor": actor,
        "timestamp": timestamp,
        "details": details,
        "eventHash": event_hash,
        "previousHash": previous_hash,
        "severity": severity,
    }
    AUDIT_EVENTS.append(event)
    persist_audit_event(event)
    return event


def verify_audit_chain() -> bool:
    previous_hash = "GENESIS"
    for event in AUDIT_EVENTS:
        if event.get("previousHash") != previous_hash:
            return False
        payload = (
            f"{event.get('previousHash')}|{event.get('timestamp')}|{event.get('actor')}|"
            f"{event.get('action')}|{event.get('entityId')}|{event.get('details')}"
        )
        expected = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        if event.get("eventHash") != expected:
            return False
        previous_hash = expected
    return True


def initialize_runtime_state() -> None:
    ensure_runtime_db()
    JOBS.clear()
    AUDIT_EVENTS.clear()
    EVIDENCE_RESULTS.clear()

    with connect_runtime_db() as conn:
        for row in conn.execute("SELECT payload FROM runtime_jobs"):
            job = json.loads(row["payload"])
            if job.get("job_id"):
                JOBS[job["job_id"]] = job

        for row in conn.execute("SELECT payload FROM runtime_audit_events ORDER BY sequence ASC"):
            AUDIT_EVENTS.append(json.loads(row["payload"]))

        for row in conn.execute("SELECT map_id, payload FROM runtime_evidence_results ORDER BY uploaded_at DESC"):
            EVIDENCE_RESULTS.setdefault(row["map_id"], []).append(json.loads(row["payload"]))


def connect_runtime_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def ensure_runtime_db() -> None:
    global RUNTIME_DB_READY
    if RUNTIME_DB_READY:
        return

    with connect_runtime_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS runtime_jobs (
                job_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS runtime_audit_events (
                id TEXT PRIMARY KEY,
                sequence INTEGER NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS runtime_evidence_results (
                id TEXT PRIMARY KEY,
                map_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                uploaded_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS regulator_links (
                url TEXT PRIMARY KEY,
                regulator TEXT NOT NULL,
                title TEXT,
                checksum TEXT NOT NULL,
                source_url TEXT NOT NULL,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL
            )
            """
        )
    RUNTIME_DB_READY = True


def persist_job(job: dict[str, Any]) -> None:
    ensure_runtime_db()
    with connect_runtime_db() as conn:
        conn.execute(
            """
            INSERT INTO runtime_jobs (job_id, payload, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(job_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
            """,
            (job["job_id"], json.dumps(job, default=str), job.get("updated_at") or datetime.utcnow().isoformat() + "Z"),
        )


def persist_audit_event(event: dict[str, Any]) -> None:
    ensure_runtime_db()
    sequence = len(AUDIT_EVENTS)
    with connect_runtime_db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO runtime_audit_events (id, sequence, payload, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (event["id"], sequence, json.dumps(event, default=str), event["timestamp"]),
        )


def persist_evidence_result(map_id: str, result: dict[str, Any]) -> None:
    ensure_runtime_db()
    with connect_runtime_db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO runtime_evidence_results (id, map_id, payload, uploaded_at)
            VALUES (?, ?, ?, ?)
            """,
            (result["id"], map_id, json.dumps(result, default=str), result["uploadedAt"]),
        )


def get_seen_regulator_link(url: str) -> dict[str, Any] | None:
    ensure_runtime_db()
    with connect_runtime_db() as conn:
        row = conn.execute("SELECT * FROM regulator_links WHERE url = ?", (url,)).fetchone()
    return dict(row) if row else None


def save_regulator_link(link: dict[str, Any]) -> None:
    ensure_runtime_db()
    now = datetime.utcnow().isoformat() + "Z"
    previous = get_seen_regulator_link(link["url"])
    first_seen = previous["first_seen"] if previous else now
    with connect_runtime_db() as conn:
        conn.execute(
            """
            INSERT INTO regulator_links (url, regulator, title, checksum, source_url, first_seen, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                regulator = excluded.regulator,
                title = excluded.title,
                checksum = excluded.checksum,
                source_url = excluded.source_url,
                last_seen = excluded.last_seen
            """,
            (
                link["url"],
                link["regulator"],
                link.get("title", ""),
                link["checksum"],
                link["sourceUrl"],
                first_seen,
                now,
            ),
        )


def start_regulator_monitor() -> None:
    global MONITOR_THREAD_STARTED
    if MONITOR_THREAD_STARTED:
        return
    MONITOR_THREAD_STARTED = True
    thread = threading.Thread(target=_run_regulator_monitor, name="orbital-regulator-monitor", daemon=True)
    thread.start()


def _run_regulator_monitor() -> None:
    while True:
        try:
            run_regulator_check()
        except Exception as exc:
            append_audit_event(
                entity_type="System",
                entity_id="regulator-monitor",
                action="Regulator monitor failed",
                actor="ORBITAL Monitor",
                details=str(exc),
                severity="medium",
            )
        time.sleep(MONITOR_INTERVAL_SECONDS)


def list_tasks(department: str | None = None) -> list[dict[str, Any]]:
    ensure_runtime_db()
    if not table_exists("tasks") or not table_exists("obligations"):
        return []

    params: list[Any] = []
    where = ""
    if department:
        where = "WHERE t.assigned_department = ?"
        params.append(department)

    query = f"""
        SELECT
            t.id AS task_id,
            t.obligation_id,
            t.assigned_department,
            t.status AS task_status,
            t.evidence_submitted,
            t.submitted_at,
            o.actor,
            o.action,
            o.deadline,
            o.mandatory,
            o.domain,
            o.department,
            o.evidence_required,
            o.severity,
            o.source_section,
            o.source_page,
            o.review_flag,
            o.status AS obligation_status
        FROM tasks t
        JOIN obligations o ON t.obligation_id = o.id
        {where}
        ORDER BY
            CASE LOWER(o.severity)
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                ELSE 3
            END,
            t.id DESC
    """
    with connect_runtime_db() as conn:
        rows = [dict(row) for row in conn.execute(query, params)]
    return [hydrate_task(row) for row in rows]


def mark_task_complete_runtime(task_id: int, evidence: str) -> dict[str, Any]:
    ensure_runtime_db()
    if not table_exists("tasks"):
        raise HTTPException(status_code=404, detail="Task table not found. Run a pipeline job first.")

    submitted_at = datetime.utcnow().isoformat() + "Z"
    with connect_runtime_db() as conn:
        task_row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not task_row:
            raise HTTPException(status_code=404, detail="Task not found.")

        conn.execute(
            """
            UPDATE tasks
            SET status = 'completed', evidence_submitted = ?, submitted_at = ?
            WHERE id = ?
            """,
            (evidence, submitted_at, task_id),
        )

        obligation_id = task_row["obligation_id"]
        pending = conn.execute(
            "SELECT COUNT(*) AS c FROM tasks WHERE obligation_id = ? AND status != 'completed'",
            (obligation_id,),
        ).fetchone()["c"]
        if pending == 0 and table_exists("obligations"):
            conn.execute("UPDATE obligations SET status = 'completed' WHERE id = ?", (obligation_id,))

    updated = [task for task in list_tasks() if task["taskId"] == task_id]
    return updated[0] if updated else {"taskId": task_id, "taskStatus": "completed", "evidenceSubmitted": evidence, "submittedAt": submitted_at}


def close_tasks_for_map_card(card: dict[str, Any], evidence: str) -> list[dict[str, Any]]:
    tasks = find_tasks_for_map_card(card)
    completed: list[dict[str, Any]] = []
    for task in tasks:
        if task.get("taskStatus") != "completed":
            completed.append(mark_task_complete_runtime(task["taskId"], evidence))
        else:
            completed.append(task)
    return completed


def find_tasks_for_map_card(card: dict[str, Any]) -> list[dict[str, Any]]:
    action = normalize_text(card.get("summary") or card.get("title") or "")
    departments = {normalize_text(item) for item in card.get("assignedDepartments", [])}
    matched: list[dict[str, Any]] = []
    for task in list_tasks():
        task_action = normalize_text(task.get("action", ""))
        task_dept = normalize_text(task.get("assignedDepartment", ""))
        if action and task_action == action:
            if not departments or task_dept in departments:
                matched.append(task)

    if matched:
        return matched

    obligation_id = str(card.get("obligationId", "")).replace("MAP-", "")
    return [
        task for task in list_tasks()
        if obligation_id and obligation_id in str(task.get("sourceSection", ""))
    ]


def table_exists(table_name: str) -> bool:
    with connect_runtime_db() as conn:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table_name,),
        ).fetchone()
    return row is not None


def hydrate_task(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "taskId": row.get("task_id"),
        "obligationId": row.get("obligation_id"),
        "assignedDepartment": row.get("assigned_department") or "Compliance",
        "taskStatus": row.get("task_status") or "pending",
        "evidenceSubmitted": row.get("evidence_submitted"),
        "submittedAt": row.get("submitted_at"),
        "actor": row.get("actor") or "bank",
        "action": row.get("action") or "Review regulatory obligation",
        "deadline": parse_jsonish(row.get("deadline")),
        "mandatory": bool(row.get("mandatory")),
        "domain": row.get("domain") or "Other",
        "departments": parse_jsonish(row.get("department")) or [],
        "evidenceRequired": parse_jsonish(row.get("evidence_required")) or [],
        "severity": row.get("severity") or "medium",
        "sourceSection": row.get("source_section") or "N/A",
        "sourcePage": row.get("source_page") or 0,
        "reviewFlag": row.get("review_flag"),
        "obligationStatus": row.get("obligation_status") or "pending",
    }


def parse_jsonish(value: Any) -> Any:
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value


def normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def discover_document_links(regulator: str, source_url: str) -> list[dict[str, Any]]:
    html = fetch_text(source_url)
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html, flags=re.IGNORECASE)
    titles = extract_link_titles(html)
    links: list[dict[str, Any]] = []
    seen: set[str] = set()

    for href in hrefs:
        absolute_url = urljoin(source_url, html_lib.unescape(href.strip()))
        parsed_path = urlparse(absolute_url).path.lower()
        if not parsed_path.endswith(DOCUMENT_LINK_SUFFIXES):
            continue
        if absolute_url in seen:
            continue
        seen.add(absolute_url)
        title = titles.get(href) or Path(urlparse(absolute_url).path).name or absolute_url
        checksum = hashlib.sha256(absolute_url.encode("utf-8")).hexdigest()
        links.append(
            {
                "regulator": regulator,
                "title": html_lib.unescape(re.sub(r"\s+", " ", title)).strip(),
                "url": absolute_url,
                "sourceUrl": source_url,
                "checksum": checksum,
            }
        )

    return links[:50]


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "ORBITAL-Regulatory-Monitor/0.1"})
    with urlopen(request, timeout=15) as response:
        content_type = response.headers.get("content-type", "")
        charset_match = re.search(r"charset=([\w-]+)", content_type)
        charset = charset_match.group(1) if charset_match else "utf-8"
        return response.read(2_000_000).decode(charset, errors="ignore")


def extract_link_titles(html: str) -> dict[str, str]:
    titles: dict[str, str] = {}
    pattern = re.compile(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', flags=re.IGNORECASE | re.DOTALL)
    for href, body in pattern.findall(html):
        text = re.sub(r"<[^>]+>", " ", body)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            titles[href] = text
    return titles


@app.exception_handler(FileNotFoundError)
def missing_artifact_handler(_request: Any, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": f"Artifact not found: {exc}"})
