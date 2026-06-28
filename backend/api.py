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
import re
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "output"
EVIDENCE_DIR = BASE_DIR / "evidence_uploads"
DB_PATH = Path(os.environ.get("DB_PATH", BASE_DIR / "orbital.db"))
ALLOWED_SUFFIXES = {".pdf", ".docx", ".pptx"}
ALLOWED_EVIDENCE_SUFFIXES = {".pdf", ".docx", ".txt", ".md", ".csv", ".log", ".png", ".jpg", ".jpeg"}

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
    matched, missing = validate_evidence(requirements, evidence_text)
    result_label = evidence_result_label(matched, missing)
    result = {
        "id": evidence_id,
        "mapCardId": map_id,
        "fileName": file.filename,
        "uploadedBy": "Department user",
        "uploadedAt": datetime.utcnow().isoformat() + "Z",
        "validationResult": result_label,
        "matchedRequirements": matched,
        "missingRequirements": missing,
        "recommendation": evidence_recommendation(result_label, missing),
        "requiresHumanReview": True,
    }
    EVIDENCE_RESULTS.setdefault(map_id, []).append(result)
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


def validate_evidence(requirements: list[str], evidence_text: str) -> tuple[list[str], list[str]]:
    text = evidence_text.lower()
    matched: list[str] = []
    missing: list[str] = []
    for requirement in requirements:
        keywords = extract_keywords(requirement)
        hits = sum(1 for keyword in keywords if keyword in text)
        if keywords and hits >= max(1, min(3, len(keywords)) // 2):
            matched.append(requirement)
        else:
            missing.append(requirement)
    return matched, missing


def extract_keywords(value: str) -> list[str]:
    stopwords = {
        "the", "and", "for", "with", "must", "contain", "readable", "proof", "evidence",
        "provide", "provided", "this", "that", "from", "against", "card", "map",
    }
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9/-]{3,}", value.lower())
    return [word for word in words if word not in stopwords][:8]


def evidence_result_label(matched: list[str], missing: list[str]) -> str:
    if matched and not missing:
        return "Pass"
    if matched and missing:
        return "Partial"
    return "Human Review Required"


def evidence_recommendation(result_label: str, missing: list[str]) -> str:
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


@app.exception_handler(FileNotFoundError)
def missing_artifact_handler(_request: Any, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": f"Artifact not found: {exc}"})
