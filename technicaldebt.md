# BudgetBrain — Technical Debt & Architecture Decisions (`technicaldebt.md`)

**Project:** BudgetBrain — Personal Expense Tracker  
**Document Status:** Active / Reference  
**Last Updated:** August 28, 2026  

---

## 1. Overview & Context

This document logs all architectural decisions, design tradeoffs, known technical debt, and cloud infrastructure resolutions for the **BudgetBrain V1** application stack. 

The application is designed as a lightweight, single-user expense tracker using Python FastAPI, SQLAlchemy 2.0 Asyncpg, PostgreSQL, and Next.js 16 / React 19.

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

### TD-5: Deferred Phase 2 Features (P2 Backlog) — Partially Resolved
- **Context**: SRS §3.7 & Appendix B mark data export and advanced features as Phase 2 scope.
- **P2 Deferred Items**:
  1. CSV / Excel / PDF expense export.
  2. Recurring expenses engine (recurring tagging implemented; auto-creation engine deferred).
  3. Income tracking & net balance dashboard widgets.
- **Items Resolved in Current Session**:
  - ~~Multi-currency converter (V1 is fixed INR `₹`)~~ → **Resolved**: Dynamic multi-currency support added (INR, USD, EUR, GBP) with live exchange rate API integration.

---

### TD-6: Cloud PostgreSQL Connection String SNI Routing (Supabase Connection Pooling)
- **Context**: Supabase direct database connection requires DSN SNI hostname identification (`asyncpg.connect(dsn=db_url)`). Passing separate tuple arguments (`host`, `user`, `password`, `database`) strips SNI routing headers, causing `asyncpg.exceptions.InternalServerError: (ENOIDENTIFIER) no tenant identifier provided`.
- **Solution Implemented**: Standardized all async database connection scripts ([`backend/scripts/seed_clean_data.py`](file:///d:/BudgetBrain/backend/scripts/seed_clean_data.py) and [`backend/scripts/add_recurring_column.py`](file:///d:/BudgetBrain/backend/scripts/add_recurring_column.py)) to parse and pass `dsn=db_url`.

---

### TD-7: Cross-Origin Resource Sharing (CORS) Policy for Vercel Monorepo Frontends — Resolved
- **Context**: Browsers enforce CORS when Next.js hosted on Vercel (`https://budget-brain-eight.vercel.app`) queries Render FastAPI backend (`https://budgetbrain-ojnr.onrender.com`).
- **Solution Implemented**: Configured `CORSMiddleware` in [`backend/app/main.py`](file:///d:/BudgetBrain/backend/app/main.py) to dynamically use `settings.allowed_origins_list` driven by the `ALLOWED_ORIGINS` environment variable, enabling fine-grained control and eliminating security risks of open wildcard permissions.
- **Status**: **Resolved**.

---

### TD-8: Next.js 16 Webpack Path Alias Resolution in Subfolder Monorepos
- **Context**: In subfolder monorepos (`frontend/`), Next.js App Router path aliases (`@/*`) must resolve relative to `frontend/src`.
- **Solution Implemented**: Explicitly declared Webpack alias mapping in [`frontend/next.config.ts`](file:///d:/BudgetBrain/frontend/next.config.ts) (`config.resolve.alias['@'] = path.resolve(__dirname, 'src')`) and unignored `frontend/src/lib/` in `.gitignore`.

---

### TD-9: Multi-Currency — Frontend-Only Dynamic View Conversion (No Backend Schema Change)
- **Context**: Multi-currency support was added without modifying the database schema. All amounts are stored as base currency INR in the database.
- **Architecture Decision**: The frontend acts as the sole conversion layer. On read, amounts are multiplied by the exchange rate for the active view currency. On write (expense creation, budget limit setting), user-entered amounts are divided by the rate to convert back to INR before API submission.
- **Conversion Provider**: [`CurrencyProvider.tsx`](file:///d:/BudgetBrain/frontend/src/providers/CurrencyProvider.tsx) fetches live rates from `https://open.er-api.com/v6/latest/INR` (free, no API key required) on mount, with hardcoded fallback rates for offline resilience.
- **Technical Debt Assessment**:
  - **Rate Staleness**: Exchange rates are fetched once on page load and not refreshed during the session. For high-accuracy financial applications, a polling interval (e.g. every 15 minutes) or WebSocket stream would be needed.
  - **Precision Loss**: JavaScript floating-point arithmetic introduces minor rounding discrepancies (<0.01 unit) during conversion. For accounting-grade precision, a `Decimal.js` or server-side conversion with Python `Decimal` would be required.
  - **Search Filter Edge Case**: Min/max amount filters on the expense search page convert user input to INR before API calls. If the exchange rate changes between page load and filter submission, results may have marginal boundary mismatches.

---

### TD-10: Hardcoded Currency Symbol in Recharts Y-Axis Tick Formatters
- **Context**: The `SpendTrendChart.tsx` and `MonthlyCategoryGraph.tsx` components originally used hardcoded `₹` symbols in their Y-axis `tickFormatter` callbacks (`tickFormatter={(v) => '₹' + v}`).
- **Problem**: When the user switched to USD, EUR, or GBP via the currency selector, chart axis labels still displayed `₹`.
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
  - **No Background Sync**: Offline expense creation is not supported. If the user is offline and tries to log an expense, the API call will fail silently. A future enhancement could queue offline mutations in IndexedDB and replay them when connectivity is restored (`Background Sync API`).
  - **Cache Versioning**: Cache version is hardcoded as `budgetbrain-cache-v1`. On significant static asset changes, the version string must be manually incremented to trigger old cache eviction.
  - **No Push Notifications**: The service worker does not implement push notification handlers. Budget limit alerts are only shown within the app UI.

---

### TD-12: PWA Install Prompt — `beforeinstallprompt` Browser Support Matrix
- **Context**: The custom install popup ([`PWAInstallPrompt.tsx`](file:///d:/BudgetBrain/frontend/src/components/layout/PWAInstallPrompt.tsx)) relies on the `beforeinstallprompt` browser event to intercept and customize the installation flow.
- **Browser Compatibility**:
  - ✅ **Chromium-based browsers** (Chrome, Edge, Opera, Samsung Internet, Brave): Full support for `beforeinstallprompt` event and `prompt()` method.
  - ❌ **Firefox**: Does not fire `beforeinstallprompt`. Users must manually install via browser menu.
  - ❌ **Safari / iOS**: Does not support `beforeinstallprompt`. Users must use the Share → "Add to Home Screen" flow. The `appleWebApp` metadata in `layout.tsx` enables standalone mode once added.
- **Fallback Handling**: The component gracefully degrades — if `beforeinstallprompt` never fires (unsupported browser), the popup simply never appears, and users can still install via native browser mechanisms.

---

### TD-13: Framer Motion Bundle Size Impact
- **Context**: Framer Motion (`framer-motion` package) adds approximately 30-40KB gzipped to the client JavaScript bundle.
- **Architecture Decision**: Accepted the bundle size increase in exchange for polished micro-interactions (hover springs, tap feedback, row enter/exit animations, container orchestration). These animations significantly elevate the perceived quality and premium feel of the application.
- **Technical Debt Assessment**: If bundle size becomes a concern in future, individual animation utilities can be extracted using `motion/react` tree-shakeable imports (available in Framer Motion v11+) or replaced with lighter CSS `@keyframes` alternatives for simpler effects.

---

### TD-14: Monthly Stats Report — Projection Accuracy Limitations
- **Context**: The [`MonthlyStatsReport.tsx`](file:///d:/BudgetBrain/frontend/src/components/dashboard/MonthlyStatsReport.tsx) widget projects month-end spending by linearly extrapolating: `projectedTotal = (totalSpent / elapsedDays) * totalDaysInMonth`.
- **Limitation**: Linear projection assumes uniform daily spending. Real-world spending patterns are non-uniform (e.g. higher spending on weekends, salary days, bill payment dates). The projection may overestimate or underestimate significantly in early days of the month (days 1-5) where sample size is small.
- **Future Improvement**: A weighted moving average or time-series regression model could provide more accurate month-end forecasts as more historical data accumulates.

---

## 3. Maintenance & Code Quality Standards

- **PEP 8 Compliance**: All top-level imports clean; no mid-file or inline module imports.
- **Configuration Hygiene**: Zero hardcoded credentials or database URLs. All settings resolved dynamically via `app.config.get_settings()`.
- **Testing Standard**: 100% of new router endpoints or service methods must include corresponding unit/integration test cases in `backend/tests/`.
- **Currency Formatting Standard**: All user-facing monetary values must use `useFormatCurrency()` hook or `formatCurrency()` utility. Never hardcode currency symbols (`₹`, `$`, `€`, `£`) in display components.
- **Animation Consistency**: All interactive card/button components should use Framer Motion `whileHover` and `whileTap` props with consistent spring physics (`type: "spring", stiffness: 300, damping: 20`).
