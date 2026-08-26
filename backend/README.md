# BudgetBrain — Backend

Personal expense tracker API built with FastAPI + async SQLAlchemy 2.0 + PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Runtime | Python 3.12 |
| ASGI Server | uvicorn |
| Database | PostgreSQL (Supabase in production) |
| ORM | async SQLAlchemy 2.0 |
| DB Driver | asyncpg |
| Migrations | Alembic |
| Config | Pydantic Settings |
| Testing | pytest + httpx |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── config.py            # Env-driven config (Pydantic Settings)
│   ├── database.py          # Async engine + session
│   ├── exceptions.py        # Custom exceptions + handlers
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── repositories/        # DB access layer
│   ├── services/            # Business logic layer
│   └── routers/             # FastAPI route handlers
├── migrations/              # Alembic migration scripts
├── tests/                   # pytest test suite
├── .env.example             # Environment variable template
├── alembic.ini
└── requirements.txt
```

---

## Architecture

```
Request → Router → Service → Repository → Database
                     ↓
                  (validation, business rules)
```

- **Routers** — HTTP layer only. No business logic.
- **Services** — All business logic and validation.
- **Repositories** — All database access. No business logic.

---

## Getting Started (Local)

### 1. Create virtual environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
```

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Start the server

```bash
uvicorn app.main:app --reload
```

### 6. Open API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Running Tests

```bash
pytest tests/ -v
```

---

## API Base Path

All endpoints are under `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Health check |
| GET/POST | /categories | List / Create categories |
| GET/PATCH/DELETE | /categories/{id} | Get / Update / Delete category |
| GET/POST | /expenses | List / Create expenses |
| GET/PATCH/DELETE | /expenses/{id} | Get / Update / Delete expense |
| GET/POST | /budgets | List / Create budgets |
| PATCH | /budgets/{id} | Update budget |
| GET | /dashboard/summary | Total spend + recent expenses |
| GET | /dashboard/by-category | Category breakdown |
| GET | /dashboard/trend | Spend over time |
| GET | /dashboard/comparison | Month-over-month |
| GET | /dashboard/top-categories | Top spending categories |

---

## Response Format

**Success:**
```json
{ "data": ..., "meta": { "page": 1, "page_size": 20, "total": 100 } }
```

**Error:**
```json
{ "error": { "code": "NOT_FOUND", "message": "Category not found", "field": null } }
```
