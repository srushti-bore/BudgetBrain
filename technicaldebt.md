# BudgetBrain — Technical Debt & Architecture Decisions (`technicaldebt.md`)

**Project:** BudgetBrain — Personal Expense Tracker  
**Document Status:** Active / Reference  
**Last Updated:** August 27, 2026  

---

## 1. Overview & Context

This document logs all architectural decisions, design tradeoffs, known technical debt, and cloud infrastructure resolutions for the **BudgetBrain V1** application stack. 

The application is designed as a lightweight, single-user expense tracker using Python FastAPI, SQLAlchemy 2.0 Asyncpg, PostgreSQL, and Next.js / React.

---

## 2. Technical Debt & Architectural Decisions Log

### TD-1: Single-Tenant Access Boundary (No Authentication)
- **Context & Requirement**: SRS §1.4 & §6.4 explicitly dictate an authentication-free application.
- **Architectural Trade-off**: The deployment URL (e.g. Render / Vercel domain) serves as the sole access boundary.
- **Technical Debt Assessment**: Zero backend session/auth middleware exists by design. If multi-user support or cloud multi-tenancy is introduced in a future major version (V2+), a tenant identifier (`user_id`) must be added to all database tables (`categories`, `expenses`, `budgets`) and foreign key constraints updated.

---

### TD-2: Windows Async Event Loop Connection Engine Cache
- **Context**: Python 3.13 on Windows uses `ProactorEventLoop`. Instantiating multiple `create_async_engine()` calls across different pytest async loops or request loops can cause `RuntimeError: Task attached to a different loop` or connection socket leaks.
- **Solution Implemented**: Implemented `get_engine_and_factory()` in [`app/database.py`](file:///d:/BudgetBrain/backend/app/database.py) to cache engine instances per running event loop ID (`asyncio.get_running_loop()`).
- **Future Improvement**: In production container environments (Linux Docker on Render/Railway), standard connection pooling with `pool_size=10, max_overflow=20` operates cleanly.

---

### TD-3: Database Full-Text Search vs Trigram Search Engine
- **Context**: SRS §3.4 requires text search on `title` and `notes`.
- **Solution Implemented**: Current implementation uses PostgreSQL `ILIKE` pattern matching across `title` and `notes` fields in `ExpenseRepository.list_with_filters()`.
- **Future Improvement**: For high data volumes (> 100,000 expenses), a PostgreSQL `pg_trgm` GIN index or `tsvector` column with auto-updating triggers can be added via Alembic migration for sub-millisecond full-text queries.

---

### TD-4: Asyncpg Single-Statement Prepared Query Constraint
- **Context**: Asyncpg driver forbids executing multiple semicolon-separated SQL statements inside a single prepared statement execution (e.g. `DELETE FROM expenses; DELETE FROM budgets;` fails with `PostgresSyntaxError`).
- **Solution Implemented**: All database operations (including category reassignments and bulk deletions) execute inside explicit single-statement calls within a unified `async with session.begin():` transaction block.
- **Maintenance Guidance**: When writing custom database cleanup scripts or raw SQL migrations, always execute statements individually or use Alembic script runners.

---

### TD-5: Deferred Phase 2 Features (P2 Backlog)
- **Context**: SRS §3.7 & Appendix B mark data export and advanced features as Phase 2 scope.
- **P2 Deferred Items**:
  1. CSV / Excel / PDF expense export.
  2. Recurring expenses engine.
  3. Income tracking & net balance dashboard widgets.
  4. Multi-currency converter (V1 is fixed INR `₹`).

---

### TD-6: Cloud PostgreSQL Connection String SNI Routing (Supabase Connection Pooling)
- **Context**: Supabase direct database connection requires DSN SNI hostname identification (`asyncpg.connect(dsn=db_url)`). Passing separate tuple arguments (`host`, `user`, `password`, `database`) strips SNI routing headers, causing `asyncpg.exceptions.InternalServerError: (ENOIDENTIFIER) no tenant identifier provided`.
- **Solution Implemented**: Standardized all async database connection scripts ([`backend/scripts/seed_clean_data.py`](file:///d:/BudgetBrain/backend/scripts/seed_clean_data.py) and [`backend/scripts/add_recurring_column.py`](file:///d:/BudgetBrain/backend/scripts/add_recurring_column.py)) to parse and pass `dsn=db_url`.

---

### TD-7: Cross-Origin Resource Sharing (CORS) Policy for Vercel Monorepo Frontends
- **Context**: Browsers enforce CORS when Next.js hosted on Vercel (`https://budget-brain-eight.vercel.app`) queries Render FastAPI backend (`https://budgetbrain-ojnr.onrender.com`).
- **Solution Implemented**: Configured `CORSMiddleware` in [`backend/app/main.py`](file:///d:/BudgetBrain/backend/app/main.py) with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`.

---

### TD-8: Next.js 16 Webpack Path Alias Resolution in Subfolder Monorepos
- **Context**: In subfolder monorepos (`frontend/`), Next.js App Router path aliases (`@/*`) must resolve relative to `frontend/src`.
- **Solution Implemented**: Explicitly declared Webpack alias mapping in [`frontend/next.config.ts`](file:///d:/BudgetBrain/frontend/next.config.ts) (`config.resolve.alias['@'] = path.resolve(__dirname, 'src')`) and unignored `frontend/src/lib/` in `.gitignore`.

---

## 3. Maintenance & Code Quality Standards

- **PEP 8 Compliance**: All top-level imports clean; no mid-file or inline module imports.
- **Configuration Hygiene**: Zero hardcoded credentials or database URLs. All settings resolved dynamically via `app.config.get_settings()`.
- **Testing Standard**: 100% of new router endpoints or service methods must include corresponding unit/integration test cases in `backend/tests/`.
