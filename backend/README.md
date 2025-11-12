# HR ATS Backend (FastAPI + MSSQL)

## Prerequisites
- Python 3.10+
- Microsoft SQL Server (local or remote)
- ODBC Driver 17 for SQL Server

## Setup
1. Create and fill `.env` (already scaffolded) with your DB and JWT settings.
2. Install deps:
```
pip install -r requirements.txt
```
3. Run dev server:
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
4. Open docs at http://localhost:8000/docs

## Notes
- CORS allows http://localhost:3000 (React frontend).
- Resumes are stored as VARBINARY(MAX).
- JWT carries `sub` (user id) and `role` in claims.
