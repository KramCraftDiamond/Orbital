# ORBITAL - Banking Risk Intelligence

Regulation to action. Action to proof.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, React Router
- Backend: Python, FastAPI, Docling, Groq/Ollama, SQLite, NetworkX

## Frontend

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend reads `VITE_API_URL` from `.env`. The default local API URL is:

```env
VITE_API_URL=http://localhost:8000
```

## Backend API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn api:app --reload --port 8000
```

Health check:

```powershell
Invoke-WebRequest http://localhost:8000/api/health
```

## Current Integration Contract

- `POST /api/documents/upload` starts a pipeline job for a PDF, DOCX, or PPTX file.
- `GET /api/jobs/{job_id}` returns queued/running/completed/failed status.
- `GET /api/documents/{job_id}` returns the rich document JSON produced by the pipeline.
- `GET /api/documents/{job_id}/obligations` returns extracted obligations and validation.
- `GET /api/documents/{job_id}/map-cards` returns frontend-ready MAP cards derived from obligations.
- `GET /api/documents/{job_id}/graph` returns graph JSON.
- `POST /api/regulators/check` checks configured regulator sources, extracts document links, and flags new/changed links.
- `POST /api/map-cards/{map_id}/evidence/upload` uploads evidence and returns matched, missing, contradicted, and snippet-backed validation results.
- `GET /api/map-cards/{map_id}/evidence` returns evidence validation results for a MAP card.
- `GET /api/audit/events` returns persisted hash-chained audit events plus chain verification status.

Runtime jobs, evidence validation results, regulator link sightings, and audit events are persisted in SQLite tables inside the configured `DB_PATH`.
