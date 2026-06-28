"""
view_db.py - Quick viewer for the reg_ingestion.db SQLite database.
Usage:
    python view_db.py                          # show all tables summary
    python view_db.py --table obligations       # show all obligations
    python view_db.py --table tasks             # show all tasks
    python view_db.py --dept "Compliance"       # tasks for a department
    python view_db.py --export obligations.json # export obligations to JSON
"""

import argparse
import json
import sqlite_utils
from ingestion.storage.db import get_pending_tasks

DB_PATH = "myregulations.db"

def show_summary(db: sqlite_utils.Database):
    print("\n📦 DATABASE SUMMARY")
    print("─" * 50)
    for table in ["documents", "obligations", "tasks"]:
        if table in db.table_names():
            count = db[table].count
            print(f"  {table:<20} {count} rows")
    print()

def show_documents(db: sqlite_utils.Database):
    rows = list(db["documents"].rows)
    if not rows:
        print("No documents found.")
        return
    print(f"\n📄 DOCUMENTS ({len(rows)} total)")
    print("─" * 60)
    for r in rows:
        print(f"  [{r['id']}] {r['filename']}  (ingested: {r['ingested_at'][:19]})")
    print()

def show_obligations(db: sqlite_utils.Database):
    rows = list(db["obligations"].rows)
    if not rows:
        print("No obligations found.")
        return
    print(f"\n⚖️  OBLIGATIONS ({len(rows)} total)")
    print("─" * 80)
    for r in rows:
        depts = json.loads(r.get("department", "[]"))
        deadline_raw = r.get("deadline", "null")
        try:
            deadline_obj = json.loads(deadline_raw) if deadline_raw and deadline_raw.startswith("{") else deadline_raw
            if isinstance(deadline_obj, dict):
                deadline_str = f"{deadline_obj['type']}: {deadline_obj['value']}"
            else:
                deadline_str = str(deadline_obj)
        except Exception:
            deadline_str = deadline_raw
        flag = f"  ⚠ REVIEW: {r['review_flag']}" if r.get("review_flag") else ""
        print(f"\n  [{r['id']}] {r['severity'].upper():8} | {r['status']:10} | p.{r['source_page']}")
        print(f"       Actor  : {r['actor']}")
        print(f"       Action : {r['action']}")
        print(f"       Deadline: {deadline_str}")
        print(f"       Domain : {r['domain']}")
        print(f"       Depts  : {', '.join(depts) if depts else '—'}")
        if flag:
            print(f"       {flag}")
    print()

def show_tasks(db: sqlite_utils.Database):
    rows = list(db["tasks"].rows)
    if not rows:
        print("No tasks found.")
        return
    pending = [r for r in rows if r["status"] == "pending"]
    done    = [r for r in rows if r["status"] == "completed"]
    print(f"\n📋 TASKS ({len(rows)} total | {len(pending)} pending | {len(done)} completed)")
    print("─" * 80)
    for r in rows:
        icon = "✅" if r["status"] == "completed" else "🔲"
        submitted = f"  evidence: {r['evidence_submitted']}" if r.get("evidence_submitted") else ""
        print(f"  {icon} [{r['id']}] {r['assigned_department']:25} obl#{r['obligation_id']}{submitted}")
    print()

def show_dept_tasks(dept: str):
    tasks = get_pending_tasks(DB_PATH, dept)
    if not tasks:
        print(f"\nNo pending tasks for '{dept}'.")
        return
    print(f"\n🏢 PENDING TASKS FOR: {dept} ({len(tasks)} tasks)")
    print("─" * 70)
    for t in tasks:
        depts = t.get("department", [])
        if isinstance(depts, list):
            depts_str = ", ".join(depts)
        else:
            depts_str = str(depts)
        print(f"\n  Task #{t['task_id']} | Obligation #{t['id']} | p.{t['source_page']}")
        print(f"    Actor   : {t['actor']}")
        print(f"    Action  : {t['action']}")
        print(f"    Domain  : {t['domain']}")
        print(f"    Depts   : {depts_str}")
    print()

def export_to_json(db: sqlite_utils.Database, filepath: str):
    rows = list(db["obligations"].rows)
    for r in rows:
        for field in ["department", "evidence_required"]:
            try:
                r[field] = json.loads(r.get(field, "[]"))
            except Exception:
                pass
        deadline_raw = r.get("deadline", "")
        try:
            if deadline_raw and deadline_raw.startswith("{"):
                r["deadline"] = json.loads(deadline_raw)
        except Exception:
            pass
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Exported {len(rows)} obligations to {filepath}\n")

def main():
    parser = argparse.ArgumentParser(description="View reg_ingestion.db contents")
    parser.add_argument("--db", default=DB_PATH, help="Path to SQLite DB")
    parser.add_argument("--table", choices=["documents", "obligations", "tasks"], help="Show a specific table")
    parser.add_argument("--dept", help="Show pending tasks for a department")
    parser.add_argument("--export", metavar="FILE.json", help="Export obligations to JSON")
    args = parser.parse_args()

    db = sqlite_utils.Database(args.db)

    if args.dept:
        show_dept_tasks(args.dept)
        return

    if args.export:
        export_to_json(db, args.export)
        return

    if args.table == "documents":
        show_documents(db)
    elif args.table == "obligations":
        show_obligations(db)
    elif args.table == "tasks":
        show_tasks(db)
    else:
        # Default: show everything
        show_summary(db)
        show_documents(db)
        show_obligations(db)
        show_tasks(db)

if __name__ == "__main__":
    main()
