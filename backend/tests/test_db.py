import pytest
import sqlite_utils
from ingestion.storage.db import save_document, save_obligations, get_pending_tasks, mark_task_complete

@pytest.fixture
def temp_db_path(tmp_path):
    """Provides a temporary, isolated SQLite database for each test run."""
    return str(tmp_path / "test_ingestion.db")

def test_db_workflow(temp_db_path):
    # 1. Register a fake document
    doc_id = save_document(temp_db_path, "sample_rbi_circular.pdf")
    
    db = sqlite_utils.Database(temp_db_path)
    docs = list(db["documents"].rows)
    assert len(docs) == 1
    assert docs[0]["filename"] == "sample_rbi_circular.pdf"
    
    # 2. Save a normalized obligation
    fake_obs = [
        {
            "actor": "Bank",
            "action": "submit annual report",
            "deadline": {"type": "relative", "value": "within 30 days"},
            "mandatory": True,
            "domain": "Compliance",
            # Notice this applies to TWO departments
            "department": ["Retail Banking", "Legal"],
            "evidence_required": ["annual report document"],
            "severity": "high",
            "source_section": "1.1",
            "source_page": 1,
            "review_flag": None
        }
    ]
    
    save_obligations(temp_db_path, doc_id, fake_obs)
    
    obs_rows = list(db["obligations"].rows)
    assert len(obs_rows) == 1
    assert obs_rows[0]["status"] == "pending"
    assert obs_rows[0]["document_id"] == doc_id
    
    task_rows = list(db["tasks"].rows)
    # The DB logic should automatically branch 1 obligation into 2 tasks (one for each department)
    assert len(task_rows) == 2
    
    # 3. Query tasks for Retail Banking
    retail_tasks = get_pending_tasks(temp_db_path, "Retail Banking")
    assert len(retail_tasks) == 1
    assert retail_tasks[0]["action"] == "submit annual report"
    assert isinstance(retail_tasks[0]["department"], list) # Ensures hydration works
    
    # Query tasks for Legal
    legal_tasks = get_pending_tasks(temp_db_path, "Legal")
    assert len(legal_tasks) == 1
    
    # 4. Progress check: Mark Retail Banking's task as complete
    retail_task_id = retail_tasks[0]["task_id"]
    mark_task_complete(temp_db_path, retail_task_id, "retail_report_submitted.pdf")
    
    # Check that Retail's task is completed
    updated_retail_task = db["tasks"].get(retail_task_id)
    assert updated_retail_task["status"] == "completed"
    assert updated_retail_task["evidence_submitted"] == "retail_report_submitted.pdf"
    
    # The parent obligation should STILL be pending because Legal hasn't finished!
    assert db["obligations"].get(obs_rows[0]["id"])["status"] == "pending"
    
    # Mark Legal's task as complete
    legal_task_id = legal_tasks[0]["task_id"]
    mark_task_complete(temp_db_path, legal_task_id, "legal_signoff.pdf")
    
    # NOW the parent obligation should automatically be completed
    assert db["obligations"].get(obs_rows[0]["id"])["status"] == "completed"
