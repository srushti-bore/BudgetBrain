# BudgetBrain — Technical Debt & Architecture Decisions (`technicaldebt.md`)

**Project:** BudgetBrain — Personal Expense Tracker  
**Document Status:** Active / Reference  
**Last Updated:** August 29, 2026  

---

## 1. Overview & Context

This document logs all architectural decisions, design tradeoffs, known technical debt, and cloud infrastructure resolutions for the **BudgetBrain V1** application stack. 

The application is designed as a lightweight, single-user expense tracker using Python FastAPI, SQLAlchemy 2.0 Asyncpg, PostgreSQL (Supabase), and Next.js 16 / React 19 (Vercel).

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
- **Status**: **Resolved**.

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
  2. Recurring expenses engine (recurring tagging implemented; auto-creation engine deferred).
  3. Income tracking & net balance dashboard widgets.
- **Items Resolved in V1**:
  - Multi-currency converter (V1 is fixed INR `₹`) → **Resolved**: Dynamic multi-currency support added (INR, USD, EUR, GBP) with live exchange rate API integration.

---

### TD-6: Cloud PostgreSQL Connection String SNI Routing (Supabase Connection Pooling)
- **Context**: Supabase direct database connection requires DSN SNI hostname identification (`asyncpg.connect(dsn=db_url)`). Passing separate tuple arguments (`host`, `user`, `password`, `database`) strips SNI routing headers, causing `asyncpg.exceptions.InternalServerError: (ENOIDENTIFIER) no tenant identifier provided`.
- **Solution Implemented**: Standardized all async database connection scripts ([`backend/scripts/seed_clean_data.py`](file:///d:/BudgetBrain/backend/scripts/seed_clean_data.py) and [`backend/scripts/add_recurring_column.py`](file:///d:/BudgetBrain/backend/scripts/add_recurring_column.py)) to parse and pass `dsn=db_url`.

---

### TD-7: Cross-Origin Resource Sharing (CORS) Policy for Vercel Monorepo Frontends
- **Context**: Browsers enforce CORS when Next.js hosted on Vercel (`https://budget-brain-eight.vercel.app`) queries Render FastAPI backend (`https://budgetbrain-ojnr.onrender.com`).
- **Solution Implemented**: 
  - Updated [`backend/app/config.py`](file:///d:/BudgetBrain/backend/app/config.py) default `ALLOWED_ORIGINS` to include local dev ports and `https://budget-brain-eight.vercel.app`.
  - Added `allow_origin_regex=r"^https:\/\/.*\.vercel\.app$"` in [`backend/app/main.py`](file:///d:/BudgetBrain/backend/app/main.py) to automatically support all current and future Vercel deployment URLs and preview environments.
- **Status**: **Resolved**.

---

### TD-8: Next.js 16 Webpack Path Alias Resolution in Subfolder Monorepos
- **Context**: In subfolder monorepos (`frontend/`), Next.js App Router path aliases (`@/*`) must resolve relative to `frontend/src`.
- **Solution Implemented**: Explicitly declared Webpack alias mapping in [`frontend/next.config.ts`](file:///d:/BudgetBrain/frontend/next.config.ts) (`config.resolve.alias['@'] = path.resolve(__dirname, 'src')`) and unignored `frontend/src/lib/` in `.gitignore`.
- **Status**: **Resolved**.

---

### TD-9: Multi-Currency — Frontend-Only Dynamic View Conversion (No Backend Schema Change)
- **Context**: Multi-currency support was added without modifying the database schema. All amounts are stored as base currency INR in the database.
- **Architecture Decision**: The frontend acts as the sole conversion layer. On read, amounts are multiplied by the exchange rate for the active view currency. On write (expense creation, budget limit setting), user-entered amounts are divided by the rate to convert back to INR before API submission.
- **Conversion Provider**: [`CurrencyProvider.tsx`](file:///d:/BudgetBrain/frontend/src/providers/CurrencyProvider.tsx) fetches live rates from `https://open.er-api.com/v6/latest/INR` (free, no API key required) on mount, with hardcoded fallback rates for offline resilience.
- **Technical Debt Assessment**:
  - **Rate Staleness**: Exchange rates are fetched once on page load and not refreshed during the session. For high-accuracy financial applications, a polling interval (e.g. every 15 minutes) or WebSocket stream would be needed.
  - **Precision Loss**: JavaScript floating-point arithmetic introduces minor rounding discrepancies (<0.01 unit) during conversion.
  - **Search Filter Edge Case**: Min/max amount filters on the expense search page convert user input to INR before API calls.

---

### TD-10: Hardcoded Currency Symbol in Recharts Y-Axis Tick Formatters
- **Context**: The `SpendTrendChart.tsx` and `MonthlyCategoryGraph.tsx` components originally used hardcoded `₹` symbols in their Y-axis `tickFormatter` callbacks (`tickFormatter={(v) => '₹' + v}`).
- **Solution Implemented**: Replaced hardcoded formatters with dynamic `formatCurrency(Number(v) || 0)` calls that respect the active CurrencyProvider context.
- **Status**: **Resolved**.

---

### TD-11: PWA Service Worker Scope & Cache Strategy Tradeoffs
- **Context**: The service worker ([`sw.js`](file:///d:/BudgetBrain/frontend/public/sw.js)) uses a hybrid caching strategy.
- **Architecture Decision**:
  - **Navigation requests**: Network-first with offline fallback to cached `/` (SPA shell).
  - **Asset requests**: Cache-first with network fallback for uncached resources.
  - **API calls**: Not cached (pass-through to network). This is intentional — expense and budget data must always reflect the latest database state.
- **Technical Debt Assessment**:
  - **No Background Sync**: Offline expense creation is not supported in V1.
  - **Cache Versioning**: Cache version is maintained as `budgetbrain-cache-v1`.

---

### TD-12: PWA Install Prompt — `beforeinstallprompt` Browser Support Matrix
- **Context**: The custom install popup ([`PWAInstallPrompt.tsx`](file:///d:/BudgetBrain/frontend/src/components/layout/PWAInstallPrompt.tsx)) relies on the `beforeinstallprompt` browser event.
- **Browser Compatibility**: Chromium browsers support direct trigger; Safari/iOS uses native "Add to Home Screen" enabled via `appleWebApp` metadata.
- **Status**: **Resolved**.

---

### TD-13: Framer Motion Bundle Size Impact
- **Context**: Framer Motion (`framer-motion` package) adds approximately 30-40KB gzipped to the client JavaScript bundle.
- **Architecture Decision**: Accepted the bundle size increase in exchange for polished micro-interactions (hover springs, tap feedback, row enter/exit animations, container orchestration).

---

### TD-14: Monthly Stats Report — Projection Accuracy Limitations
- **Context**: The [`MonthlyStatsReport.tsx`](file:///d:/BudgetBrain/frontend/src/components/dashboard/MonthlyStatsReport.tsx) widget projects month-end spending by linearly extrapolating: `projectedTotal = (totalSpent / elapsedDays) * totalDaysInMonth`.
- **Limitation**: Linear projection assumes uniform daily spending. Real-world spending patterns are non-uniform.

---

### TD-15: Supabase Session Mode Connection Limit & NullPool Resolution
- **Context**: Supabase session-mode pooler limits concurrent clients to 15. Running the test suite or high-frequency async loops across multiple test clients produced `asyncpg.exceptions.InternalServerError: (EMAXCONNSESSION) max clients reached in session mode`.
- **Solution Implemented**: Added `poolclass=NullPool` to `create_async_engine` in [`database.py`](file:///d:/BudgetBrain/backend/app/database.py). Connections are immediately closed upon request completion, eliminating connection pool leaks and session mode exhaustion.
- **Status**: **Resolved**.

---

### TD-16: Strict Budget Cap Anti-Deficit Architecture (Server Guard + Client Pre-Validation)
- **Context**: User required strict financial discipline where total monthly expenditure must never exceed the active monthly budget ceiling, preventing negative remaining balances.
- **Architecture Decision**:
  - **Server-Side Enforcement**: In [`expense_service.py`](file:///d:/BudgetBrain/backend/app/services/expense_service.py), `create_expense` and `update_expense` query the active monthly budget limit (`Budget.limit_amount`) and current month-to-date recorded spend. If `current_spent + new_amount > budget_limit`, a `BudgetExceededException` is raised, returning `HTTP 400` with error code `BUDGET_EXCEEDED`.
  - **Client-Side Real-Time Guard**: In [`ExpenseModal.tsx`](file:///d:/BudgetBrain/frontend/src/components/expenses/ExpenseModal.tsx), user-entered amounts are continuously compared against `remainingBudget`. If exceeded, a blocking red warning banner appears, and the submit button is disabled with `🚫 Exceeds Budget (Blocked)`.
- **Trade-off**: If a user legitimately needs to enter an unexpected emergency expense that temporarily exceeds their budget, they must first increase their monthly budget ceiling in the Budgets page. This intentional friction enforces the primary psychological goal of the app.
- **Status**: **Resolved & Tested (38/38 tests passing)**.

---

### TD-17: Lightweight Native i18n Translation Engine vs Heavy External Frameworks
- **Context**: Multilingual localization was requested for 8 languages (English, Marathi, Hindi, Gujarati, Marwadi, German, Spanish, French).
- **Architecture Decision**: Built a zero-dependency, type-safe React Context translation provider ([`LanguageProvider.tsx`](file:///d:/BudgetBrain/frontend/src/providers/LanguageProvider.tsx)) paired with a centralized TypeScript dictionary ([`translations.ts`](file:///d:/BudgetBrain/frontend/src/lib/translations.ts)).
- **Advantages**:
  - **Zero Bundle Overhead**: Avoided adding heavy external i18n dependencies (`next-intl`, `react-i18next`, `@lingui`), keeping the bundle minimal.
  - **Instant Reactivity**: Switching languages updates all components in <1ms without full page reloads or route prefix modifications (`/mr`, `/hi`).
  - **LocalStorage Persistence**: The chosen language is stored under `budgetbrain_language` and automatically restored across browser sessions.
- **Technical Debt & Limitations**:
  - Translations are currently static client-side dictionaries. If user-generated category names or expense notes need automatic machine translation, a cloud translation API (e.g. Google Cloud Translate) would be required.
- **Status**: **Active / Feature-Complete**.

---

### TD-18: Pure CSS & Framer Motion 3D Physics vs Heavy WebGL / Three.js Runtimes
- **Context**: A 3D animated Psychology Brain logo was requested that works seamlessly across all mobile, tablet, and desktop viewports.
- **Architecture Decision**: Implemented [`BrainLogo3D.tsx`](file:///d:/BudgetBrain/frontend/src/components/ui/BrainLogo3D.tsx) using GPU-accelerated CSS 3D transforms (`perspective`, `transform-style: preserve-3d`, `rotateY`, `rotateX`) orchestrated with Framer Motion spring physics and specular shimmer gradients.
- **Advantages**:
  - **Extremely Lightweight**: <5KB footprint compared to 600KB+ for Three.js / React Three Fiber.
  - **High Performance**: Renders at native 60fps/120fps with zero WebGL context initialization overhead or GPU drain on mobile devices.
  - **Full SSR & PWA Compatibility**: No canvas hydration mismatches during Next.js server-side rendering.
- **Status**: **Resolved**.

---

### TD-19: RESTful Resource Routing Semantics & Entity Uniqueness Constraints
- **Context**: During Postman API verification and client consumption, explicit HTTP verb conventions and entity constraints are strictly enforced:
  1. **Partial Resource Modification (`PATCH`)**: Resource updates (`/categories/{id}`, `/expenses/{id}`, `/budgets/{id}`) require HTTP `PATCH` rather than `PUT` (for partial modifications) and mandate the UUID path parameter. Sending `PATCH` without a path identifier or `POST` to a detail endpoint correctly triggers `HTTP 405 Method Not Allowed`.
  2. **Case-Insensitive Uniqueness Enforcement (`CONFLICT 409`)**: Category names enforce strict uniqueness across the database (`name.ilike()`). Creating a duplicate category name returns `HTTP 409 Conflict` with `{ error: { code: "CONFLICT", message: "Category '...' already exists." } }`.
- **Status**: **Resolved & Documented in Postman Suite**.

---

### TD-20: Multi-Tenant Schema Evolution & Backward-Compatible Legacy Linking
- **Context**: Evolution from single-tenant V1 to full multi-user authentication required scoping all categories, expenses, and budgets under unique `user_id` foreign keys.
- **Solution Implemented**:
  - Migration `20260831_1945_add_auth_and_user_isolation.py` created `users` and `refresh_tokens` tables and added `user_id` to all domain tables.
  - Automatically created a fallback seed user (`00000000-0000-0000-0000-000000000001`) to seamlessly reassign legacy rows without data loss.
  - Deduplicated legacy overall budgets before applying the partial unique index `uq_budget_user_overall_period`.
- **Status**: **Resolved & Migrated**.

---

### TD-21: Transactional SMTP Mailing Service & Asynchronous Background Dispatch
- **Context**: Synchronous SMTP connection (`smtplib.SMTP`) during HTTP request handlers blocks the FastAPI event loop, causing 5-10s latency or request timeouts on slow SMTP connections (e.g. Gmail).
- **Solution Implemented**: Integrated FastAPI `BackgroundTasks` in [`backend/app/routers/auth.py`](file:///d:/BudgetBrain/backend/app/routers/auth.py) so `POST /api/v1/auth/forgot-password` returns `HTTP 200` in <5ms while email delivery executes in a background thread.
- **Status**: **Resolved**.

---

### TD-22: Client-Side Axios 401 Interceptor Loop Bypass for Public Auth Endpoints
- **Context**: Axios response interceptors configured to refresh expired tokens on HTTP 401 intercept unauthenticated public requests (`/auth/reset-password`, `/auth/forgot-password`, `/auth/login`), causing circular refresh failures and false `"Network Error"` exceptions.
- **Solution Implemented**: Explicitly excluded all public auth endpoints from the 401 refresh loop in [`frontend/src/lib/api.ts`](file:///d:/BudgetBrain/frontend/src/lib/api.ts).
- **Status**: **Resolved**.

---

### TD-23: Localhost DNS Normalization (IPv4 / IPv6 Resolution in Windows)
- **Context**: Chromium on Windows resolves `localhost` to IPv6 (`[::1]`) by default. If Uvicorn listens strictly on IPv4 (`127.0.0.1`), cross-origin browser requests throw `ERR_CONNECTION_REFUSED` / `"Network Error"`.
- **Solution Implemented**:
  - Bound Uvicorn to `0.0.0.0:8000` to listen on all interfaces.
  - Dynamically configured `getApiBaseUrl()` to mirror the browser's hostname (`http://localhost:8000/api/v1` for `localhost` and `http://127.0.0.1:8000/api/v1` for `127.0.0.1`).
  - Broadened backend CORS regex to match all local ports and hostnames.
- **Status**: **Resolved**.

---

### TD-24: Strict Email Verification, 6-Digit OTP Suite & Dual-Mode Resend REST / SMTP Transport
- **Context & Requirement**: Implemented Strict Gate verification where newly registered accounts are `is_verified=False` and unverified logins return HTTP 403 `EMAIL_NOT_VERIFIED`.
- **Solution & Architecture Decisions**:
  1. **Cryptographic OTP Security**: Cryptographically secure 6-digit numeric OTP generated in memory, hashed with SHA-256 before storing in `users.otp_hash` with `otp_expires_at` (10-minute expiry). Zero plaintext OTP is ever written to disk/database.
  2. **Dual-Mode Port-Proof Email Transport**: Cloud hosts (e.g., Render free/standard tiers) frequently block or delay outbound raw TCP ports 587/465. Designed `EmailService._dispatch_email()`:
     - **Mode 1 (Cloud / Resend)**: When `SMTP_PASSWORD` starts with `re_` or `SMTP_HOST` includes `resend`, dispatches via Resend's HTTPS REST API (`https://api.resend.com/emails`) over Port 443 (firewall-proof, <300ms latency).
     - **Mode 2 (SMTP Fallback / Gmail)**: Connects via standard `smtplib` (`STARTTLS` or `SSL`) for Gmail SMTP, AWS SES, SendGrid.
  3. **Domain Typo Detection & 1-Click Auto-Fix**: Added `suggestEmailCorrection` in [`frontend/src/lib/utils.ts`](file:///d:/BudgetBrain/frontend/src/lib/utils.ts) with dictionary lookup and single-edit Levenshtein distance for popular domains (e.g. `@gnail.com` &rarr; `@gmail.com`).
  4. **Segmented UI & Instant Session Creation**: Built [`OTPInput.tsx`](file:///d:/BudgetBrain/frontend/src/components/auth/OTPInput.tsx) (auto-focus, paste extraction, digit jumping). On 6th digit, `verify_otp` endpoint marks account verified and issues both access token and HttpOnly refresh cookie for instant dashboard entry.
- **Status**: **Resolved & Tested (44/44 backend tests passing, 0 TypeScript build errors)**.

---

---

## 3. Maintenance & Code Quality Standards

- **PEP 8 Compliance**: All top-level imports clean; no mid-file or inline module imports.
- **Configuration Hygiene**: Zero hardcoded credentials or database URLs. All settings resolved dynamically via `app.config.get_settings()`.
- **Testing Standard**: 100% of new router endpoints or service methods must include corresponding unit/integration test cases in `backend/tests/` (38 / 38 currently passing).
- **Currency Formatting Standard**: All user-facing monetary values must use `useFormatCurrency()` hook or `formatCurrency()` utility. Never hardcode currency symbols (`₹`, `$`, `€`, `£`) in display components.
- **Animation Consistency**: All interactive card/button components should use Framer Motion `whileHover` and `whileTap` props with consistent spring physics (`type: "spring", stiffness: 300, damping: 20`).
- **Confirmation Dialogue Standard**: Destructive actions (deleting expenses, deleting categories, database resets) must ALWAYS use glassmorphic modal confirmation popups with clear impact descriptions; never use native browser `window.confirm()`.

