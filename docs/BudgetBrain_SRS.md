# Software Requirements Specification (SRS)

**Project:** BudgetBrain — Personal Expense Tracker with Secure Multi-Tenant Authentication  
**Version:** 2.0  
**Status:** Final / Authoritative  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional, technical, security, and architectural requirements for **BudgetBrain**, a personal expense-tracking web application. This document serves as the single source of truth for engineering, data modeling, API contracts, security standards, and user experience.

### 1.2 Document Conventions
- **FR-n** references functional requirements originating from the Product Requirements Document (PRD).
- **FR-AUTH-n** references authentication, session, and identity requirements.
- **FR-ISO-n** references multi-tenant data isolation and ownership enforcement requirements.
- Priority levels: **P0** (Critical / Mandatory), **P1** (High / Core Feature), **P2** (Enhancement).

### 1.3 Intended Audience
Development engineers, system architects, security auditors, and product stakeholders.

### 1.4 Project Scope
BudgetBrain is a multi-tenant, cloud-deployed web application featuring:
1. **Secure JWT & OAuth 2.0 Authentication:** Sign Up, Login, Google Sign-In (OIDC), Token Refresh with Rotation, Revocation, and Multi-Device Session Termination.
2. **Strict Multi-Tenant Data Isolation:** Complete data privacy where every user operates in an isolated environment without RBAC/admin overhead.
3. **Core Expense & Budget Management:** Dynamic user-owned categories, multi-filter search, monthly and daily budget goal tracking with strict Anti-Deficit protection.
4. **Visual Analytics & Usability:** Interactive charts, 8-language localization, dynamic multi-currency conversions, PWA installability, and responsive glassmorphic UI.

---

## 2. Overall Description

### 2.1 Product Architecture
BudgetBrain operates as a decoupled, multi-tier cloud application:
- **Frontend Layer:** Next.js 16 (React 19, TypeScript, Tailwind CSS, Framer Motion) hosted on Vercel. Communicates with the backend using an Axios client configured with `withCredentials: true` and automated JWT refresh interceptors.
- **Backend API Layer:** Python 3.12+ FastAPI with async SQLAlchemy 2.0 and Pydantic v2 hosted on Render. Derives authenticated identity exclusively from validated JWT Security Contexts.
- **Data Layer:** PostgreSQL (Supabase / Render) managed with async Alembic migrations and connection pooling (`NullPool` for serverless/session mode).

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 16 Client                     │
│  (Auth Context, PWA, 8 Languages, Currency Provider)   │
└─────────────────────────┬──────────────────────────────┘
                          │ HTTPS / REST (JSON)
                          │ Authorization: Bearer <Access Token>
                          │ Cookie: refresh_token (HttpOnly, Secure)
┌─────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend                     │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Security & Auth Middleware (JWT / Google Verify)   │ │
│ └───────────────────────┬────────────────────────────┘ │
│ ┌───────────────────────▼────────────────────────────┐ │
│ │ Routers (Auth, Expenses, Categories, Budgets, Dash)│ │
│ └───────────────────────┬────────────────────────────┘ │
│ ┌───────────────────────▼────────────────────────────┐ │
│ │ Service Layer (Business Logic + Anti-Deficit Guard)│ │
│ └───────────────────────┬────────────────────────────┘ │
│ ┌───────────────────────▼────────────────────────────┐ │
│ │ Repository Layer (SQLAlchemy 2.0 Async Queries)    │ │
│ │ Enforces WHERE user_id = :current_user_id on all DB│ │
│ └───────────────────────┬────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────┘
                          │ Asyncpg (NullPool)
┌─────────────────────────▼──────────────────────────────┐
│                 PostgreSQL Database                    │
│   (users, refresh_tokens, categories, expenses, budgets)
└────────────────────────────────────────────────────────┘
```

### 2.2 User Classes & Authorization Model
- **Single Role Model:** All registered accounts are individual user tenants.
- **No Admin / RBAC System:** Every authenticated user possesses equal permissions over their own private data and zero permissions over any other user's data.
- **Ownership Enforcement:** Authorization is derived strictly from the verified JWT `sub` claim. Frontend-supplied `user_id` values in request bodies or query parameters are never trusted for authorization.

### 2.3 Operating Environment
| Layer | Technology Specification |
|---|---|
| Backend Runtime | Python 3.12+, FastAPI, Uvicorn (ASGI) |
| Database Engine | PostgreSQL 16+ / 17 (Supabase / Render) |
| ORM & Migrations | SQLAlchemy 2.0 Async, Alembic |
| Auth & Cryptography | Passlib / Argon2 / BCrypt, PyJWT / Authlib, Google Auth Lib |
| Frontend Runtime | Next.js 16 (App Router), React 19, TypeScript |
| UI & Animation | Vanilla CSS, Tailwind CSS, Framer Motion, Recharts, Lucide Icons |
| Hosting & Cloud | Vercel (Frontend) + Render (Backend) + Supabase (PostgreSQL) |

---

## 3. Specific Functional Requirements

### 3.1 Authentication & Session Management

#### FR-AUTH-1: User Registration
- Endpoint: `POST /api/v1/auth/register`
- Validates email format, unique email check (case-insensitive), password strength (min 8 characters, at least 1 uppercase, 1 lowercase, 1 number).
- Hashes password using Argon2 or BCrypt (cost factor ≥ 12).
- Automatically seeds default starter categories (`Food`, `Transport`, `Housing`, `Entertainment`, `Utilities`, `Healthcare`, `Shopping`, `Uncategorized`) linked to the new `user_id`.
- Returns user profile, Access Token, and sets `refresh_token` in an HttpOnly cookie.

#### FR-AUTH-2: User Login (Email & Password)
- Endpoint: `POST /api/v1/auth/login`
- Validates credentials against stored hash.
- Enforces rate limiting (max 5 failed attempts per 15 minutes per IP/email).
- Issues short-lived Access Token (10–15 min expiry) and generates a cryptographically secure Refresh Token (7–30 days expiry).
- Stores the SHA-256 hash of the Refresh Token in the `refresh_tokens` database table.
- Sets the plaintext Refresh Token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.

#### FR-AUTH-3: Google OAuth 2.0 / OpenID Connect Sign-In
- Endpoint: `POST /api/v1/auth/google`
- Client obtains Google ID Token via Google Sign-In button and sends `{ "id_token": "..." }` to backend.
- Backend verifies the ID Token directly with Google APIs (checking signature, audience `GOOGLE_CLIENT_ID`, and expiration).
- If user exists by Google ID or verified email, safely links account.
- If user is new, creates `User` record with `is_verified=True` and seeds starter categories.
- Issues standard application Access Token + HttpOnly Refresh Token.

#### FR-AUTH-4: Refresh Token Rotation & Automatic Token Refresh
- Endpoint: `POST /api/v1/auth/refresh`
- Reads `refresh_token` cookie from request.
- Hashes incoming token and verifies existence, expiration, and non-revoked status in `refresh_tokens` table.
- **Token Rotation:** Revokes the used refresh token, issues a brand new Refresh Token + Access Token, and updates the database and cookie.
- If a revoked or reused refresh token is presented, invalidates all sessions for the affected user (Breach Detection).

#### FR-AUTH-5: Secure Logout & Session Revocation
- Endpoint: `POST /api/v1/auth/logout`
- Marks the current refresh token as `revoked=True` in the database.
- Clears the `refresh_token` cookie (`Max-Age=0`).

#### FR-AUTH-6: Logout from All Devices / Sessions
- Endpoint: `POST /api/v1/auth/logout-all`
- Sets `revoked=True` on all active refresh tokens associated with `current_user.id`.
- Clears the local cookie.

#### FR-AUTH-7: Forgot & Reset Password
- Endpoints: `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
- Generates cryptographically secure, time-limited (15–30 min) reset token.
- Reset token is hashed in DB; single-use only.

#### FR-AUTH-8: Change Password
- Endpoint: `POST /api/v1/auth/change-password`
- Requires valid JWT and verification of `old_password` before setting `new_password`.

---

### 3.2 User Data Isolation & Ownership Rules (FR-ISO)

1. **Security Context Derivation:** All protected routes inject `current_user: User = Depends(get_current_user)`.
2. **Query Scoping:** Every database read, insert, update, or delete query must include `WHERE user_id = :current_user.id`.
3. **Cross-Tenant Blocking:**
   - `GET /expenses/{id}`: Returns `404 Not Found` if expense does not belong to `current_user.id`.
   - `PATCH /expenses/{id}`: Returns `404 Not Found` if expense does not belong to `current_user.id`.
   - `DELETE /expenses/{id}`: Returns `404 Not Found` if expense does not belong to `current_user.id`.
   - The same rule applies to categories and budgets.
4. **Category Isolation:** Category names are unique per-user (`UNIQUE(user_id, lower(name))`), allowing User A and User B to independently have their own "Groceries" category.

---

### 3.3 Expense Management (FR-2 to FR-5)
- **Full CRUD:** Create, Read (Paginated/Filtered/Sorted), Update, Delete.
- **Fields:** `id`, `user_id`, `title`, `amount`, `category_id`, `date`, `notes`, `payment_mode`, `is_recurring`, `created_at`, `updated_at`.
- **Anti-Deficit Protection:** Over-budget expenses are permitted; the remaining balance dynamically shifts to negative deficit (-₹X,XXX) with coral visual indicators across Dashboard and Budgets pages.
- **Safe Deletion:** Glassmorphic confirmation modal on UI; restores deleted amount back to active budget.

---

### 3.4 Category Management (FR-6 to FR-10)
- **User-Scoped CRUD:** Create, Rename, Delete with Warn-and-Reassign flow.
- **Uncategorized Protection:** Each user has a protected system category `"Uncategorized"` (`is_system=True`) that cannot be deleted or renamed.
- **Deletion Reassignment:** Deleting a category with linked expenses reassigns them to the user's `"Uncategorized"` category in a single atomic transaction.

---

### 3.5 Budget Goal Tracking (FR-26 to FR-28)
- **Monthly Overall & Category Budgets:** Configured per user per calendar month.
- **Daily Spending Limit:** Optional daily allowance with real-time dashboard progress tracking.
- **Live Status Thresholds:** On Track (< 80%), Near Limit (80%–100%, configurable), Over Budget (> 100%).

---

### 3.6 Dashboard Analytics (FR-17 to FR-25)
- **Summary Metrics:** Total spent, monthly budget remaining, daily spending average, recent 5 expenses.
- **Charts:** Category Spend Breakdown Donut Chart (weekly/monthly toggle), Spend Trend over Time (day/week/month), Month-over-Month comparison, Top 5 spending categories.
- **Predictive Monthly Report:** Spend velocity projection and financial health badge.

---

### 3.7 AI Financial Intelligence Suite (FR-AI-1 to FR-AI-5)
- **FR-AI-1 (Provider-Agnostic LLM Engine):** Decoupled multi-provider abstraction (`LLMProvider`) supporting Google Gemini (`gemini-1.5-flash`, `gemini-2.0-flash`), OpenAI (`gpt-4o-mini`, compatible endpoints like Ollama/Groq), and Anthropic Claude (`claude-3-5-haiku`), resolved dynamically through `AI_PROVIDER` and environment variables with zero code changes.
- **FR-AI-2 (Smart Financial Insights & Savings Advisor):** Analyzes tenant's monthly transactions, burn rate, category concentration, and deficit. Generates structured, actionable cards (💡 Savings Tip, ⚠️ Deficit Alert, 🎯 Spending Pacing).
- **FR-AI-3 (Contextual Auto-Categorization):** Recommends category and payment mode dynamically based on expense title and historical spending patterns.
- **FR-AI-4 (Adaptive Budget Recommendations):** Analyzes 30-day spending patterns to recommend optimal monthly limits and daily caps with 1-click apply.
- **FR-AI-5 ("Ask BudgetBrain" Conversational Co-Pilot):** Natural language Q&A interface for financial queries (available in English and Marathi).
- **NFR-AI-1 (Privacy & Zero-Cost Fallback):** Zero PII (names, emails, passwords) sent to external LLMs. Includes a deterministic mathematical rules fallback engine that operates seamlessly when no API key is provided or during network outages.

---

## 4. Data Requirements & Schema Specifications

### 4.1 Entity: `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, UUID | Unique user identifier |
| `email` | VARCHAR(255) | Unique, Index, Not Null | User email address (lowercase) |
| `hashed_password` | VARCHAR(255) | Nullable (null for OAuth-only) | Argon2 / BCrypt password hash |
| `full_name` | VARCHAR(100) | Nullable | User display name |
| `avatar_url` | VARCHAR(500) | Nullable | Profile picture / Google avatar |
| `google_id` | VARCHAR(100) | Unique, Index, Nullable | Google OIDC unique subject ID |
| `is_active` | BOOLEAN | Default True, Not Null | Account active status |
| `is_verified` | BOOLEAN | Default False, Not Null | Email verification status |
| `created_at` | TIMESTAMPTZ | Not Null | Timestamp of registration |
| `updated_at` | TIMESTAMPTZ | Not Null | Timestamp of last update |

### 4.2 Entity: `refresh_tokens`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, UUID | Unique token identifier |
| `user_id` | VARCHAR(36) | FK → `users.id` (CASCADE), Index, Not Null | Owner of session |
| `token_hash` | VARCHAR(64) | Index, Not Null | SHA-256 hash of refresh token |
| `expires_at` | TIMESTAMPTZ | Index, Not Null | Token expiration timestamp |
| `revoked` | BOOLEAN | Default False, Not Null | Revocation status flag |
| `user_agent` | VARCHAR(255) | Nullable | Browser / Device user agent string |
| `ip_address` | VARCHAR(45) | Nullable | Client IP address |
| `created_at` | TIMESTAMPTZ | Not Null | Token creation timestamp |

### 4.3 Entity: `categories`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, UUID | Unique category identifier |
| `user_id` | VARCHAR(36) | FK → `users.id` (CASCADE), Index, Not Null | Tenant owner |
| `name` | VARCHAR(50) | Not Null | Category display name |
| `is_system` | BOOLEAN | Default False, Not Null | True for "Uncategorized" |
| `created_at` | TIMESTAMPTZ | Not Null | Auto timestamp |
| `updated_at` | TIMESTAMPTZ | Not Null | Auto timestamp |

*Index / Constraint:* `UNIQUE(user_id, lower(name))`

### 4.4 Entity: `expenses`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, UUID | Unique expense identifier |
| `user_id` | VARCHAR(36) | FK → `users.id` (CASCADE), Index, Not Null | Tenant owner |
| `category_id` | VARCHAR(36) | FK → `categories.id` (RESTRICT), Index, Not Null | Associated category |
| `title` | VARCHAR(50) | Not Null | Expense title |
| `amount` | NUMERIC(10,2) | Not Null, Check > 0 | Amount in base currency (INR) |
| `date` | DATE | Index, Not Null | Transaction date (<= today) |
| `notes` | TEXT | Nullable | Additional notes |
| `payment_mode` | VARCHAR(20) | Nullable | cash / card / upi / other |
| `is_recurring` | BOOLEAN | Default False, Not Null | Recurring monthly flag |
| `created_at` | TIMESTAMPTZ | Not Null | Auto timestamp |
| `updated_at` | TIMESTAMPTZ | Not Null | Auto timestamp |

*Indexes:* `(user_id, date)`, `(user_id, category_id)`, `(user_id, amount)`

### 4.5 Entity: `budgets`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, UUID | Unique budget identifier |
| `user_id` | VARCHAR(36) | FK → `users.id` (CASCADE), Index, Not Null | Tenant owner |
| `category_id` | VARCHAR(36) | FK → `categories.id` (CASCADE), Nullable | Null = overall monthly budget |
| `period_type` | VARCHAR(10) | Default 'monthly', Not Null | Period type |
| `period_start` | DATE | Index, Not Null | First day of month (YYYY-MM-01) |
| `limit_amount` | NUMERIC(10,2) | Not Null, Check > 0 | Monthly limit amount |
| `daily_limit` | NUMERIC(10,2) | Nullable | Optional daily spend limit |
| `created_at` | TIMESTAMPTZ | Not Null | Auto timestamp |
| `updated_at` | TIMESTAMPTZ | Not Null | Auto timestamp |

*Constraints:* `UNIQUE(user_id, period_type, period_start, category_id)` and Partial Unique `WHERE category_id IS NULL`.

---

## 5. External API Specifications

Base URL: `/api/v1`  
Envelope Standard: `{ "data": <payload>, "meta": <pagination/metadata> }`  
Error Standard: `{ "error": { "code": "ERROR_CODE", "message": "Description", "field": "optional_field" } }`

### 5.1 Authentication API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user; issues tokens |
| `POST` | `/auth/login` | Public | Login with email/password; issues tokens |
| `POST` | `/auth/google` | Public | Google OAuth 2.0 token verification & login |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh token & issue new access token |
| `POST` | `/auth/logout` | Authenticated | Revoke current session & clear cookie |
| `POST` | `/auth/logout-all` | Authenticated | Revoke all active sessions for current user |
| `POST` | `/auth/forgot-password` | Public | Request password reset token |
| `POST` | `/auth/reset-password` | Public | Reset password using valid reset token |
| `GET` | `/auth/me` | Authenticated | Return profile of current authenticated user |
| `POST` | `/auth/change-password`| Authenticated | Update password with old password check |

### 5.2 Core Business Endpoints (All Require `Authorization: Bearer <token>`)
| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/health` | Public app & database health check |
| **Categories**| `GET` | `/categories` | List user categories with expense counts |
| | `POST` | `/categories` | Create user-scoped category |
| | `GET` | `/categories/{id}` | Get category (owner-only) |
| | `PATCH`| `/categories/{id}` | Update category (owner-only) |
| | `DELETE`|`/categories/{id}` | Delete with warn-and-reassign (owner-only) |
| **Expenses** | `GET` | `/expenses` | List user expenses with search/filter/sort |
| | `POST` | `/expenses` | Create expense with budget cap validation |
| | `GET` | `/expenses/{id}` | Get expense (owner-only) |
| | `PATCH`| `/expenses/{id}` | Update expense (owner-only) |
| | `DELETE`|`/expenses/{id}` | Delete expense (owner-only) |
| **Budgets** | `GET` | `/budgets` | List user budgets with spent & remaining balances |
| | `POST` | `/budgets` | Set overall or category budget |
| | `GET` | `/budgets/{id}` | Get budget (owner-only) |
| | `PATCH`| `/budgets/{id}` | Update budget limit (owner-only) |
| **Dashboard** | `GET` | `/dashboard/summary` | User spend metrics, recent expenses, budget status |
| | `GET` | `/dashboard/by-category` | Category spend breakdown chart data |
| | `GET` | `/dashboard/trend` | Spend trend by day/week/month |
| | `GET` | `/dashboard/comparison` | Month-over-month comparison |
| | `GET` | `/dashboard/top-categories`| Top 5 spending categories |
| **AI Insights** | `GET` | `/ai/insights` | Personalized financial savings & deficit recommendations |
| | `POST` | `/ai/suggest-category` | Smart categorization and payment mode suggestion |
| | `GET` | `/ai/suggest-budget` | Adaptive monthly & daily budget limit recommendations |
| | `POST` | `/ai/chat` | Conversational financial co-pilot query response |

---

## 6. Non-Functional & Security Requirements

### 6.1 Security & Protection
- **No Plaintext Passwords:** Argon2 or BCrypt with minimum work factor 12.
- **Token Security:** JWT signing secrets stored strictly in environment variables (`JWT_SECRET_KEY`). Never expose secrets in client bundles or git.
- **Cookie Security:** `refresh_token` cookie configured with `HttpOnly=True`, `Secure=True` (in production), `SameSite=Lax`, and `Path=/api/v1/auth`.
- **CORS Protection:** Configured with `allow_credentials=True` restricted to trusted origins (`ALLOWED_ORIGINS`).
- **Rate Limiting:** Enforced on auth endpoints to prevent brute-force attacks.

### 6.2 Data Integrity & Isolation
- **100% Tenant Isolation:** No query shall execute without scoping to `current_user.id`.
- **Zero Mock / Hardcoded Data:** All data dynamically stored and retrieved from PostgreSQL.
- **Database Connection Pooling:** Managed with `NullPool` for clean async session termination on cloud PostgreSQL instances.

---

## 7. Definition of Done (DoD)

1. Database schema updated with `users`, `refresh_tokens`, and `user_id` foreign keys on all core entities.
2. Complete JWT and Google OAuth authentication flow verified on backend and frontend.
3. User A and User B cross-tenant access attempts tested and verified to return `404/403`.
4. All existing features (Categories, Expenses, Budgets, Dashboard, Multi-Currency, 8 Languages, PWA, 3D Logo) verified working 100% under authentication.
5. Automated test suite passing 100% with zero regressions.
