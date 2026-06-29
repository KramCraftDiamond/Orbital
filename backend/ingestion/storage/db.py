import sqlite_utils
import json
from datetime import datetime
from typing import List, Dict, Any

def get_db(db_path: str = "reg_ingestion.db") -> sqlite_utils.Database:
    """Initialize DB and rigidly create tables with foreign keys if they don't exist."""
    db = sqlite_utils.Database(db_path)
    db.conn.execute("PRAGMA journal_mode=WAL")
    db.conn.execute("PRAGMA busy_timeout=30000")
    db.conn.execute("PRAGMA foreign_keys=ON")
    
    if "documents" not in db.table_names():
        db["documents"].create({
            "id": int,
            "filename": str,
            "ingested_at": str
        }, pk="id")
        
    if "obligations" not in db.table_names():
        db["obligations"].create({
            "id": int,
            "document_id": int,
            "actor": str,
            "action": str,
            "deadline": str, # JSON serialized string
            "mandatory": bool,
            "domain": str,
            "department": str, # JSON serialized list
            "evidence_required": str, # JSON serialized list
            "severity": str,
            "source_section": str,
            "source_page": int,
            "review_flag": str,
            "status": str
        }, pk="id", foreign_keys=[("document_id", "documents", "id")])
        
    if "tasks" not in db.table_names():
        db["tasks"].create({
            "id": int,
            "obligation_id": int,
            "assigned_department": str,
            "status": str,
            "evidence_submitted": str,
            "submitted_at": str
        }, pk="id", foreign_keys=[("obligation_id", "obligations", "id")])
        
    return db

def save_document(db_path: str, filename: str) -> int:
    """Registers a new document in the DB and returns its ID."""
    db = get_db(db_path)
    result = db["documents"].insert({
        "filename": filename,
        "ingested_at": datetime.now().isoformat()
    })
    return result.last_pk

def save_obligations(db_path: str, document_id: int, obligations: List[Dict[str, Any]]):
    """Saves normalized obligations and automatically spins up tasks for each department."""
    db = get_db(db_path)
    
    for obs in obligations:
        # Convert nested structures to JSON strings for SQLite
        deadline_raw = obs.get("deadline")
        deadline = json.dumps(deadline_raw) if isinstance(deadline_raw, dict) else str(deadline_raw)
        dept_json = json.dumps(obs.get("department", []))
        ev_json = json.dumps(obs.get("evidence_required", []))
        
        obs_record = {
            "document_id": document_id,
            "actor": obs.get("actor", ""),
            "action": obs.get("action", ""),
            "deadline": deadline,
            "mandatory": obs.get("mandatory", True),
            "domain": obs.get("domain", ""),
            "department": dept_json,
            "evidence_required": ev_json,
            "severity": obs.get("severity", ""),
            "source_section": obs.get("source_section", ""),
            "source_page": obs.get("source_page", 0),
            "review_flag": obs.get("review_flag"),
            "status": "pending"
        }
        
        obs_res = db["obligations"].insert(obs_record)
        obs_id = obs_res.last_pk
        
        # Automatically generate actionable tasks per department
        departments = obs.get("department", [])
        for dept in departments:
            # Strip out normalizer flags so the department can still see it in their queue
            clean_dept = dept.replace("unmapped: ", "") if dept.startswith("unmapped: ") else dept
            
            db["tasks"].insert({
                "obligation_id": obs_id,
                "assigned_department": clean_dept,
                "status": "pending",
                "evidence_submitted": None,
                "submitted_at": None
            })

def get_pending_tasks(db_path: str, department: str) -> List[Dict[str, Any]]:
    """Retrieves all pending tasks joined with their parent obligation data."""
    db = get_db(db_path)
    
    query = """
    SELECT t.id as task_id, t.status as task_status, o.*
    FROM tasks t
    JOIN obligations o ON t.obligation_id = o.id
    WHERE t.assigned_department = ? AND t.status = 'pending'
    """
    
    tasks = list(db.query(query, [department]))
    
    # Hydrate JSON strings back to python objects for the frontend
    for t in tasks:
        try:
            if t.get("department"): t["department"] = json.loads(t["department"])
            if t.get("evidence_required"): t["evidence_required"] = json.loads(t["evidence_required"])
            if t.get("deadline") and t["deadline"].startswith("{"): t["deadline"] = json.loads(t["deadline"])
        except Exception:
            pass # Fallback to raw string if parsing fails
            
    return tasks

def mark_task_complete(db_path: str, task_id: int, evidence: str):
    """Marks a task complete with evidence. Auto-completes the parent obligation if all child tasks are done."""
    db = get_db(db_path)
    
    db["tasks"].update(task_id, {
        "status": "completed",
        "evidence_submitted": evidence,
        "submitted_at": datetime.now().isoformat()
    })
    
    # Check if sibling tasks are still pending
    task_row = db["tasks"].get(task_id)
    obs_id = task_row["obligation_id"]
    
    pending_count_res = list(db.query("SELECT count(*) as c FROM tasks WHERE obligation_id = ? AND status != 'completed'", [obs_id]))
    pending_count = pending_count_res[0]["c"]
    
    # If all departments have finished their tasks, the obligation itself is successfully fulfilled!
    if pending_count == 0:
        db["obligations"].update(obs_id, {
            "status": "completed"
        })
