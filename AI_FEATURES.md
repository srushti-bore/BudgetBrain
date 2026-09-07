# BudgetBrain — AI Features Summary

A concise overview of all **Artificial Intelligence & Behavioral Finance** features implemented in BudgetBrain.

---

### 1. AI-Powered Financial Health Insights (`/`)
- **What it does**: Analyzes real-time spending velocity, budget status, and category concentration to generate 3 personalized, actionable advice cards.
- **Key Capabilities**:
  - Detects active budget deficit risks before month-end.
  - Highlights high-spend categories (e.g. *"Food & Dining accounts for 42% of expenses"*).
  - Interactive direct action buttons: **"Set Budget →"**, **"Manage Budget →"**, **"View Expenses →"**.
- **Endpoint**: `GET /api/v1/ai/insights`

---

### 2. Smart Auto-Categorization & Payment Mode Prediction
- **What it does**: As the user types an expense title, the AI predicts the most relevant category and payment mode in real time.
- **Key Capabilities**:
  - Matches merchant names (e.g. Swiggy -> Food & Dining / UPI, Uber -> Transportation / UPI, Zara -> Shopping / Card).
  - Automatically matches against the user's custom categories.
- **Endpoint**: `POST /api/v1/ai/suggest-category`

---

### 3. Adaptive Budget Recommendations (`/budgets`)
- **What it does**: Analyzes past transactions and spending habits to suggest optimal, achievable budget limits.
- **Key Capabilities**:
  - Recommends both a **Monthly Budget Cap** and a **Daily Pacing Limit**.
  - Calculates estimated monthly savings rate.
  - **1-Click "Adopt Recommendation"** banner and **"Auto-fill"** helper chip in the budget modal.
- **Endpoint**: `GET /api/v1/ai/suggest-budget`

---

### 4. "Ask BudgetBrain" Conversational Chat & Advisor (Global Widget)
- **What it does**: A conversational financial advisor powered by `gemini-3.1-flash-lite` available across all pages.
- **Key Capabilities**:
  - **Multilingual Intelligence**: Full native fluency in **Marathi (मराठी)**, **Hindi (हिंदी)**, Hinglish, and English with automatic language-mirroring prompts.
  - Injects live tenant financial telemetry (current spend, remaining balance, deficit status, top categories).
  - Answers complex advisory questions like:
    - *"मी आज ₹3,000 चे जेवण करू शकतो का?" / "Can I afford a ₹3,000 dinner tonight?"*
    - *"माझे पैसे सर्वात जास्त कुठे खर्च होत आहेत?" / "Where is most of my money going?"*
    - *"माझा ₹2,500 चा घाटा कसा भरून काढू?" / "How do I recover from my ₹2,500 deficit?"*
  - **Interactive Chat History Drawer**: Browse past financial consultations, restore sessions with 1 click, and start fresh threads with tenant isolation via `localStorage`.
  - Floating action trigger with quick suggestion pills and sidebar quick access.
- **Endpoint**: `POST /api/v1/ai/chat`

---

### 5. Visual Mood Representation & Animated Mascot ("Brainy") (`/`)
- **What it does**: Represents financial status visually through an ambient, animated robot brain mascot (**"Brainy"**) on the dashboard, coupled with a 4-zone budget velocity speedometer.
- **Key Capabilities**:
  - **4 Live Financial Mood States**:
    - 🥳 **Thriving** (< 60% budget consumed): Cheerful bouncing mascot with particle sparkles, emerald aura, celebrating disciplined spending.
    - 🧘 **Zen** (60% – 79% budget consumed): Serene floating mascot with breathing animation, teal aura, steady balanced pacing feedback.
    - ⚡ **Cautious** (80% – 99% budget consumed): Watchful mascot with alert eyes, amber aura, discretionary spend throttling advice.
    - 😱 **Distressed** (≥ 100% budget consumed / deficit): Alarmed trembling mascot, coral/rose warning pulse, spending freeze recommendation.
  - **Interactive Tap Feedback**: Tapping Brainy triggers helpful and witty financial quips and tips.
  - **Budget Velocity Speedometer**: Visual segmented gauge with an animated needle pointing to the exact percentage of budget consumed.
  - **Safe Daily Run-Rate**: Real-time calculation of safe daily allowance (`safeDailySpend`) across remaining days in the month.
- **Integration**: Live widget `VisualMoodWidget.tsx` mounted on the main dashboard Bento Grid.

---

### 6. Visual Mood Indicators on Budget Cards (`/budgets`)
- **What it does**: Replaces generic status labels with expressive, color-coded visual mood indicators across all budget goal cards.
- **Key Capabilities**:
  - **Master Monthly Budget & Category Cards**:
    - 😱 **Distressed (Over Budget)** (≥ 100%)
    - ⚡ **Cautious (≥80%)** (80% – 99%)
    - 🧘 **Zen (Balanced)** (60% – 79%)
    - 🥳 **Thriving (On Track)** (< 60%)
  - **Frictionless Expense Entry**: Decoupled from `ExpenseModal.tsx`—users no longer have to manually select or guess an emotional feeling when logging expenses.
- **Integration**: Real-time inside `frontend/src/app/budgets/page.tsx`.

---

### 7. Multimodal AI Receipt & Bill Scanner (`📸 AI Receipt Scanner`)
- **What it does**: Automatically extracts expense data from photos of paper receipts, digital bills, restaurant checks, utility bills, and UPI payment screenshots.
- **Key Capabilities**:
  - **Device-Adaptive Triggers**:
    - **Mobile/Tablet**: Discrete **"Capture (Camera)"** (`capture="environment"`) and **"Gallery (Photos)"** buttons for touch devices.
    - **Desktop/Laptop**: Clean, intuitive **"Upload Bill"** button.
  - **Enhanced Vision OCR Prompt & Domain Rules**:
    - Specialized parsing for Indian & global invoices, utility/electricity bills (MSEDCL), supermarket/grocery receipts (D-Mart), restaurant checks (Subtotal, CGST/SGST, Round-off), and UPI payment screenshots (PhonePe, Google Pay, Paytm, BHIM).
  - **Zero-Amount Elimination & Currency Sanitizer**:
    - Built-in `_clean_extracted_amount` parser strips currency prefixes (`₹`, `$`, `€`, `Rs.`, `INR`), commas (`1,450.00`), and trailing slashes (`/-`), eliminating `0` amount display bugs.
    - Strict frontend validation (`numAmount > 0`) prevents populating empty or zero amounts into the form.
  - **Active Multimodal LLM Engine**: Powered by `gemini-3.1-flash-lite` and `gemini-flash-latest` with fallback to OpenAI and Anthropic.
- **Endpoint**: `POST /api/v1/ai/scan-receipt`

---

### 8. Actual Semantic Vector Search & RAG Ingestion (Supabase pgvector)
- **What it does**: Real Retrieval Augmented Generation (RAG) providing deep historical memory over all past user expenses.
- **Key Capabilities**:
  - **768-Dim Vector Embeddings**: Uses Google Gemini's `gemini-embedding-001` via direct REST endpoints with deterministic local fallback.
  - **Supabase pgvector Store**: High-speed HNSW cosine index `USING hnsw (embedding vector_cosine_ops)` with PostgreSQL RPC `match_expenses`.
  - **Grounded Chat & Cited Sources**: Injects relevant past transactions into LLM prompts and renders interactive **`📌 Cited Transactions [RAG]`** source badges with transaction titles, amounts, and dates under AI chat responses.
  - **1-Click Sync Engine**: Top database icon in chat header to backfill all historical transactions into the vector store.
- **Endpoints**:
  - `POST /api/v1/ai/rag/sync` (Batch backfill & index)
  - `GET /api/v1/ai/search?q=...&limit=...` (Standalone semantic search)

---

### 9. Duplicate Transaction Guard (±2 Day Sliding Window)
- **What it does**: Proactively checks prospective expenses against recorded transactions within a sliding ±2 day window (`[date - 2 days, date + 2 days]`) to prevent accidental double-logging.
- **Key Capabilities**:
  - **Multi-Tier Matching**: Exact title match, case-insensitive substring match, and multi-word token overlap.
  - **Relative Timing Telemetry**: Localized relative time messaging (*"on the same day"*, *"yesterday"*, *"tomorrow"*, *"2 days earlier"*, etc.).
  - **Debounced Interactive UI (450ms)**: Real-time amber glassmorphic warning banner with details card showing the existing transaction's title, amount, and date.
  - **Non-Blocking Control**: **"I Understand, Log Anyway"** acknowledgment button allows legitimate repeat purchases while blocking accidental duplicate submissions.
  - **Edit Isolation**: `exclude_id` ensures an expense being modified never warns against itself.
- **Endpoint**: `POST /api/v1/expenses/check-duplicate`

---

### Architecture & Provider Independence
- **Environment-Driven**: Active provider is controlled entirely via `AI_PROVIDER=gemini/openai/claude/rules`.
- **Zero Hardcoding**: All features dynamically adapt to the active model.
- **Offline / Zero-Cost Fallback**: If no API keys are provided or network errors occur, the built-in mathematical rules engine executes all features without crashing.

