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
DB_PATH = Path(os.environ.get("DB_PATH", BASE_DIR / "orbital.db"))
ALLOWED_SUFFIXES = {".pdf", ".docx", ".pptx"}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ORBITAL API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict[str, Any]] = {}


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
        update_job(job_id, status="completed", summary=summary)
    except Exception as exc:
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

    return {
        "id": f"MAP-{obligation_id}",
        "obligationId": obligation_id,
        "title": make_title(action),
        "summary": action,
        "sourceRegulator": document.get("source") or "RBI",
        "circularTitle": document.get("title") or "Uploaded circular",
        "sourceClause": obligation.get("clause_number") or obligation.get("section_id") or "N/A",
        "assignedDepartments": departments,
        "owner": departments[0] if departments else "Compliance",
        "severity": obligation.get("severity") or "medium",
        "deadline": deadline_text or document.get("effective_date") or "Not specified",
        "status": "New",
        "evidenceRequired": evidence,
        "aiReasoning": obligation.get("severity_reason") or "Generated from validated obligation extraction.",
        "validationChecklist": [f"Provide {item}" for item in evidence],
    }


def make_title(action: str) -> str:
    words = action.strip().split()
    if not words:
        return "Review regulatory obligation"
    title = " ".join(words[:10]).strip()
    return title[0].upper() + title[1:]


@app.exception_handler(FileNotFoundError)
def missing_artifact_handler(_request: Any, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": f"Artifact not found: {exc}"})
