# BudgetBrain Repository Memory & Agent Operating Guide

## Mandatory First Response Rule

* **CRITICAL REQUIREMENT**: Before executing any task or delivering any response to the user, you MUST ALWAYS begin your response with: **"Hello Srush"**.
* Communicate primarily in English unless the user explicitly converses in another language or dialect.

---

## Project Context & Architecture

**BudgetBrain** is an intelligent, privacy-first personal finance management platform combining disciplined expense tracking, multi-tenant financial telemetry, and multi-model conversational AI.

### Core Architecture Overview:
1. **Backend**:
   - **Framework**: Python 3.11+ / FastAPI under `/api/v1`.
   - **Database & ORM**: PostgreSQL with SQLAlchemy 2.0 (asyncio) and Alembic migrations.
   - **Layered Pattern**: Strictly isolated `Router → Service → Repository`. No business logic in routers.
   - **Security**: JWT access tokens (15-min expiry), HttpOnly refresh cookies, SHA-256 hashed 6-digit OTP verification, and Google Identity Services (GIS) One-Tap login.
   - **Multi-Tenancy**: All models (`Expense`, `Budget`, `Category`, `RefreshToken`) strictly isolate data by authenticated `user_id`.
2. **Frontend**:
   - **Framework**: Next.js 14 App Router, TypeScript, React 18.
   - **Styling & Animation**: Tailwind CSS, Framer Motion springs, Lucide React icons, Glassmorphism aesthetic.
   - **PWA**: Service Worker caching, offline support, installable mobile/desktop app.
3. **AI Architecture**:
   - **Design**: Abstract `BaseLLMProvider` contract driven dynamically by `AI_PROVIDER` environment variable (`gemini`, `openai`, `anthropic`, or offline mathematical `rules`).
   - **Primary Model**: `gemini-3.1-flash-lite` (sub-second latency, generous quota headroom, fluent Indic multilingual generation).
   - **Multilingual Understanding**: Native Devanagari script and Latin transliteration parsing for Marathi (मराठी & Marathinglish), Hindi (हिंदी & Hinglish), and English.
   - **Telemetry Injection**: Live financial context (monthly limit, total spent, remaining balance, deficit status, daily burn rate, top spending categories) injected into system prompts and rules engine.

---

## Key Subsystems & Established Conventions

### 1. "Ask BudgetBrain" Conversational AI Advisor & Chat History
- **Triggering & Viewport Placement**:
  - Global Floating Action Button: Dedicated to Bottom-Right (`bottom-6 right-6 z-50`) with explicit `<button id="ask-budgetbrain-btn">` and `pointer-events-none` on inner animated elements.
  - Sidebar Quick Access: Dedicated "Ask BudgetBrain AI" button in `Sidebar.tsx` triggering `window.dispatchEvent(new CustomEvent('open-budgetbrain-chat'))`.
  - Quadrant Segregation: `PWAInstallPrompt.tsx` is strictly confined to Bottom-Left (`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 lg:left-72 z-40`) to prevent any pointer-event interception.
  - Active Modal: Rendered at `z-[70]` to remain above table headers, dropdowns, and navigation elements.
- **Chat Session Architecture**:
  - Multi-tenant client-side chat session management in `AskBudgetBrainChat.tsx`.
  - Sessions persisted in `localStorage` under namespaced key `budgetbrain_chat_sessions_${userId}`.
  - Features: Slide-over Chat History drawer (`History` icon), auto-generated session topics, message counts, relative timestamps, 1-click thread restoration, and New Chat (`MessageSquarePlus`) initialization.

### 2. Deficit-Tolerant Over-Budget Logging & Timezone Grace Buffer
- **Deficit Allowance**: Budget limits are advisory and protective, but never block user transaction logging. When an expense exceeds the remaining budget, the system gracefully computes negative balances (`remaining_amount < 0`), accurately reflecting deficit states.
- **Timezone Buffer**: `ExpenseBase.validate_date` in `backend/app/schemas/expense.py` includes a 1-day future grace buffer (`datetime.now(timezone.utc).date() + timedelta(days=1)`) to handle UTC server clock vs client local time (e.g. IST UTC+5:30) differences without false validation rejections.

### 3. 4-Tier Real-Time AI Milestone Feedback Engine
- Located in `frontend/src/lib/spendMilestoneAi.ts` and integrated in `frontend/src/app/expenses/page.tsx`.
- Dispatches animated toast notifications with contextual AI emojis upon expense creation:
  - **Tier 1 (Optimal Spend, ≤50%)**: Green celebration (`🎉`, `🚀`, `🌟`, `🧘`).
  - **Tier 2 (Moderate Burn, 50% - 90%)**: Amber cautionary (`📊`, `⚖️`, `💡`, `🛡️`).
  - **Tier 3 (Near-Limit Alert, 90% - 100%)**: Orange high alert (`⚡`, `🔔`, `⚠️`, `🛑`).
  - **Tier 4 (Over-Budget Deficit, >100%)**: Rose/Crimson alarm (`🚨`, `⚠️`, `💔`, `📉`) with deficit recovery guidance.

### 4. Adaptive Budget Recommendations (`/budgets`)
- Real-time spending pattern evaluation generating sustainable monthly caps, daily pacing targets, and target savings percentages.
- Glassmorphic recommendation card provides:
  - 1-Click **"Adopt Recommendation"** directly calling `budgetApi.createOrUpdate`.
  - **"Customize in Modal"** pre-filling modal input fields.

### 5. Multimodal AI Receipt Scanner & Mood Auto-Detection
- Ingestion endpoint: `POST /api/v1/ai/scan-receipt` accepting camera captures and file uploads up to 10MB.
- Parses Merchant Title, Total Amount, Date, Suggested Category, Payment Mode, and detected Mood.
- Auto-selects `😰 Stressed` mood when the transaction breaches daily limits or monthly remaining budget.

---

## Strict Operating Rules for Agents

1. **Mandatory Greeting**: Always start every user response with **"Hello Srush"**.
2. **Environment-Driven Configuration**:
   - Zero hardcoded credentials, secret keys, or database URIs.
   - **NEVER** read, access, print, or commit `.env` files.
   - All backend configuration resolved dynamically via `app.config.get_settings()`.
3. **Multi-Tenant Isolation**:
   - Every database query for expenses, budgets, categories, or analytics MUST include `filter(Model.user_id == current_user.id)`.
4. **Currency Formatting Standard**:
   - All user-facing monetary values must use `useFormatCurrency()` hook or `formatCurrency()` utility. Never hardcode currency symbols (`₹`, `$`, etc.) in display templates.
5. **Testing & Quality Assurance**:
   - Run `pytest` before finalizing backend modifications (all 55 tests must pass).
   - Run `npm run build` or `npx tsc --noEmit` to verify frontend changes have 0 TypeScript or build errors.
6. **Documentation Integrity**:
   - Whenever architecture, endpoints, models, or UX flows change, update:
     - `progress.md` (root) and `docs/progress.md`.
     - `technicaldebt.md` (root) and `docs/technicaldebt.md`.
     - `AGENTS.md` repository memory.
