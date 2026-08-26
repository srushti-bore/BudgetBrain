# Software Requirements Specification

**Project:** BudgetBrain — Personal Expense Tracker
**Version:** 1.0 (V1 / MVP)
**Status:** Final

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional, technical, and design requirements for **BudgetBrain**, a personal expense-tracking web application. It is intended for the development team building V1 and serves as the authoritative reference for architecture, data model, API design, validation, and UI/UX.

### 1.2 Document Conventions
- **FR-n** references trace back to the source PRD's functional requirement numbering.
- Priority levels (P0/P1/P2) follow the PRD: P0 = must-have for V1, P1 = important, P2 = nice-to-have.

### 1.3 Intended Audience
Development team, QA/testing team, and the product owner (single stakeholder for this project).

### 1.4 Project Scope
BudgetBrain V1 is a **single-user, authentication-free** web application for logging expenses, managing categories, tracking budgets, and viewing spending reports. It excludes login, multi-user support, multi-currency, and bank integrations in V1 and all planned future phases (authentication is permanently out of scope per project decision).

### 1.5 References
- Product Requirements Document (PRD) — BudgetBrain, prior version
- IEEE Std 830-1998 (structural convention followed by this SRS)

---

## 2. Overall Description

### 2.1 Product Perspective
Standalone two-tier web application: a Next.js frontend communicating with a FastAPI backend over a REST API, backed by PostgreSQL. No third-party auth, payment, or banking integrations in V1.

### 2.2 Product Functions (Summary)
- Full CRUD on expenses
- User-managed dynamic categories
- Dashboard with totals, charts, and budget status
- Search, filter, and sort on expenses
- Budget goal setting (overall + optional per-category) with live tracking

### 2.3 User Classes and Characteristics
One user class: an individual tracking personal spending. No admin role, no multi-tenancy.

### 2.4 Operating Environment
| Layer | Technology |
|---|---|
| Backend runtime | Python 3.12, FastAPI, uvicorn |
| Database | PostgreSQL (17.x via Supabase in deployment) |
| Frontend runtime | Next.js, Node 20 |
| Deployment | Vercel (frontend) + Render (backend) + Supabase (database) |
| Client | Responsive web browser — desktop and mobile |

### 2.5 Design and Implementation Constraints
- **No authentication in any phase** — explicit, permanent project decision.
- No hardcoded or demo data at any stage — all data must be dynamically created, stored, and fetched from the live database (applies to development too).
- Local development must run without Docker; Docker is introduced only for deployment.
- All configuration is environment-variable driven — no hardcoded config values in source.

### 2.6 Assumptions and Dependencies
- Single fixed currency: ₹ (INR), 2 decimal places.
- Budget periods default to monthly.
- Deployment URL is the sole access boundary in the absence of authentication — the user accepts this tradeoff.

---

## 3. System Features

### 3.1 Navigation
**Description:** Hamburger menu with two sections — Dashboard (view-only) and Expenses (full management).
**Priority:** P0

### 3.2 Expense Management (FR-2 to FR-5)
**Description:** Full CRUD on expenses.
| Action | Behavior |
|---|---|
| Add | Create a new expense entry |
| View | Paginated list, default page size 20, max 100 |
| Edit | Update any field of an existing expense |
| Delete | Requires confirmation step before removal |

**Fields:** title, category, amount, date, notes (optional), payment mode (optional).
**Priority:** P0

### 3.3 Category Management (FR-6 to FR-10)
**Description:** User builds and manages their own categories rather than choosing from a fixed list.

| Action | Behavior | Priority |
|---|---|---|
| Create | Add a category while logging an expense or from category list | P0 |
| Rename | Edit an existing category name | P0 |
| Delete | See deletion flow below | P0 |
| View | List with expense count per category | P1 |
| Starter categories | Seeded on first run (Food, Transport, Rent, etc.) plus a protected "Uncategorized" system category | P2 |

**Deletion flow (FR-8):**
1. Backend checks whether the category has linked expenses.
2. If linked expenses exist, the API returns a conflict response with the count; the frontend shows a warning/confirmation dialog.
3. On user confirmation, the backend reassigns all linked expenses to "Uncategorized" and then deletes the category, inside a single transaction.
4. If no linked expenses exist, the category is deleted directly.
5. The "Uncategorized" category itself can never be deleted or renamed.

### 3.4 Search, Filter and Sort (FR-11 to FR-16)
**Description:** All capabilities work together (e.g., filter by category, then sort by amount).
| Capability | Detail | Priority |
|---|---|---|
| Search | Title and notes text only (category name search is out of scope for V1) | P1 |
| Filter — date range | e.g. this week, this month | P0 |
| Filter — category | Single category isolation | P0 |
| Filter — amount range | Min/max bounds | P1 |
| Filter — payment mode | Cash / card / UPI / other | P1 |
| Sort | By amount, date, or category | P1 |

### 3.5 Dashboard (FR-17 to FR-25)
| Feature | Priority |
|---|---|
| Total spend (overall + current month) | P0 |
| Recent expenses snapshot | P0 |
| Pie/donut chart — spend by category | P0 |
| Bar/line chart — spend over time | P0 |
| Budget status vs. goal | P0 |
| Daily/weekly/monthly report views | P0 |
| Month-over-month comparison (% change) | P1 |
| Top categories by spend | P1 |
| Average daily/weekly spend | P2 |

### 3.6 Budget / Spending Goal (FR-26 to FR-28)
**Description:** The user sets spending goals; the app tracks status automatically.
- An **overall monthly budget is required**; **per-category budgets are optional**.
- Live remaining balance = goal − spent, recalculated as expenses are added.
- Status thresholds: **on track** (below 80% of limit), **near limit** (80%–100%), **over budget** (above 100%). The 80% threshold is environment-configurable.
- **V1 supports monthly budgets only.** The data model reserves a `period_type` field for weekly budgets, but the V1 interface only exposes monthly goal-setting.
- **No automatic rollover.** Each new period requires the user to set a new budget explicitly; the previous period's limit is not auto-copied forward.
**Priority:** P0 (P1 for the near-limit alert indicator)

### 3.7 Data Export
**Description:** Export expenses as CSV/PDF/Excel — nice-to-have, implemented only if time permits; otherwise deferred to Phase 2.
**Priority:** P2

### 3.8 Data Integrity
**Description:** No hardcoded or demo data anywhere in the application, at any stage of development or deployment. All data is dynamically created, stored, and fetched from the live database.
**Priority:** P0

---

## 4. Data Requirements

### 4.1 Entity: `categories`
| Field | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(50) | Required, unique |
| is_system | BOOLEAN | Default false; true only for the seeded "Uncategorized" row |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

### 4.2 Entity: `expenses`
| Field | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| title | VARCHAR(50) | Required |
| amount | NUMERIC(10,2) | Required, must be > 0 |
| category_id | UUID | Required, foreign key to categories, restrict on delete |
| date | DATE | Required, cannot be later than today |
| notes | TEXT | Optional |
| payment_mode | VARCHAR(20) | Optional: cash / card / upi / other |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

Indexed on: date, category_id, amount, and full-text (trigram) search on title and notes.

### 4.3 Entity: `budgets`
| Field | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| category_id | UUID | Nullable — null represents the overall budget; cascades on category delete |
| period_type | VARCHAR(10) | monthly or weekly, default monthly |
| period_start | DATE | Required |
| limit_amount | NUMERIC(10,2) | Required, must be > 0 |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

Uniqueness: one budget per category (or one overall budget) per period.

---

## 5. External Interface Requirements

### 5.1 User Interfaces
Responsive web app, desktop and mobile browsers. Design direction: glassmorphism with a colorful, natural theme.

| Element | Specification |
|---|---|
| Color palette | Sage #7FB89A (primary/growth), coral #F0876B (spending/alerts), honey #F4B860 (budget/goals), sky #8FC1E3 (secondary), cream #FBF7EF (background), ink #2E3B36 (text) |
| Typography | Display/numerals: Fraunces (organic serif). Body/UI: Plus Jakarta Sans |
| Signature element | Circular budget ring with a gradient fill (sage → honey → coral) reflecting live budget status |
| Motion | Framer Motion — staggered card entrance, 3D tilt-on-hover for glass cards, spring-eased budget ring animation, count-up numeric transitions |
| Layout | Bento-style glass card grid; backdrop blur, soft shadows, layered depth |

### 5.2 API Interfaces
Base path: `/api/v1`. REST/JSON over HTTPS.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /health | App and database health status |
| GET / POST / PATCH / DELETE | /categories, /categories/{id} | Category management |
| GET / POST / PATCH / DELETE / GET | /expenses, /expenses/{id} | Expense management |
| GET | /dashboard/summary | Total spend and recent expenses |
| GET | /dashboard/by-category | Category breakdown for pie/donut chart |
| GET | /dashboard/trend | Spend-over-time data for bar/line chart |
| GET | /dashboard/comparison | Month-over-month change |
| GET | /dashboard/top-categories | Ranked category spend |
| GET / POST / PATCH | /budgets, /budgets/{id} | Budget management |

**Response envelope:** `{ "data": ..., "meta": { "page", "page_size", "total" } }`
**Error format:** `{ "error": { "code", "message", "field" } }`
**Documentation:** Auto-generated OpenAPI/Swagger at `/docs` and `/redoc`.

### 5.3 Software Interfaces
| Interface | Detail |
|---|---|
| Database driver | asyncpg (async SQLAlchemy 2.0) |
| Migrations | Alembic |
| Frontend data layer | TanStack Query against the REST API |

---

## 6. Non-Functional Requirements

### 6.1 Performance
Dashboard and reports must load from live, database-driven data at any data volume — no static or cached placeholder values.

### 6.2 Scalability
Data model and API are designed so later phases can extend the system without major rework of V1 foundations.

### 6.3 Reliability
Each development phase follows a Run → Test → Deploy cycle and must be fully functional before the next phase begins.

### 6.4 Security
No authentication layer exists in V1 or any planned future phase. The application's only access boundary is its deployment URL. This is an explicit, accepted project decision rather than an oversight.

### 6.5 Testability
Every backend module (routers, services) must be independently testable via automated tests (pytest + httpx).

### 6.6 Maintainability
Environment-driven configuration throughout (`.env.example` for both backend and frontend); no hardcoded values in source code.

### 6.7 Portability
Local development runs without containers; Docker images (separate for frontend and backend) are used only at the deployment stage, targeting Render and Vercel respectively.

---

## 7. Appendices

### Appendix A — Development & Deployment Workflow
| Stage | Backend | Frontend |
|---|---|---|
| Local development | Virtual environment, Alembic migrations, uvicorn with reload | npm install, npm run dev |
| Local testing | pytest against local PostgreSQL | Manual QA against local backend |
| Deployment | Docker image deployed to Render | Docker image (or native build) deployed to Vercel |
| Deployment database | Supabase — swap `DATABASE_URL` only, no code change | — |

### Appendix B — Out of Scope (V1)
Authentication (permanently), multiple currencies, bank/UPI/SMS auto-import, income tracking, notifications/reminders, recurring expenses, multi-user/family accounts, native mobile application. Data export is a deferred nice-to-have.

### Appendix C — Definition of Done (V1)
- Full expense CRUD functional end-to-end
- Dynamic category management with the warn-and-reassign deletion flow
- Dashboard with total spend, recent expenses, at least two charts, and budget status
- Search plus at least two filters and two sort options, usable together
- Overall budget (required) and optional per-category budgets, with live balance and status
- Hamburger navigation functional between Dashboard and Expenses
- All validation rules enforced on both frontend and backend
- No hardcoded or demo data anywhere in the system
- Deployed to Vercel, Render, and Supabase, and tested end-to-end

---

*This SRS reflects all requirements and decisions finalized during project discussion for BudgetBrain V1. No open items remain.*
