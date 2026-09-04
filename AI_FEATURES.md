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

### 4. "Ask BudgetBrain" Conversational Chat (Global Widget)
- **What it does**: A conversational financial advisor available across all pages.
- **Key Capabilities**:
  - Injects live tenant financial telemetry (current spend, remaining balance, deficit status, top categories).
  - Answers complex questions like:
    - *"Can I afford a ₹3,000 dinner tonight?"*
    - *"Where is most of my money going?"*
    - *"How do I recover from my ₹2,500 deficit?"*
  - Floating action trigger with quick suggestion pills and interactive chat history.
- **Endpoint**: `POST /api/v1/ai/chat`

---

### 5. Emotion-Aware Spending & Behavioral Insights (`/`)
- **What it does**: Correlates money and psychology by tracking 5 emotional states: 😊 Happy, 😐 Normal, 😔 Sad, 😰 Stressed, 🤩 Excited.
- **Key Capabilities**:
  - **Mood Breakdown**: Visual spend distribution across each emotional state.
  - **Category Dominance**: Maps which categories trigger specific emotions (e.g. *"Stressed: mostly Fast Food"*).
  - **Impulse Spending Radar**: Automatically flags uncharacteristic high-ticket purchases made under emotional arousal (`stressed`, `sad`, `excited`).
  - **AI Psychological Guidance Cards**: Advice on 24-hour cooling-off rules and guilt-free celebration budgets.
- **Endpoint**: `GET /api/v1/dashboard/emotional-spending`

---

### 6. AI Mood Auto-Detection & Over-Budget Stressed Trigger
- **What it does**: Eliminates manual mood selection by auto-detecting emotion and dynamically flagging budget risks.
- **Key Capabilities**:
  - Infers mood from expense title (e.g. Concert/Party -> 🤩 Excited, Hospital/Medicine -> 😰 Stressed, Dining/Spa -> 😊 Happy).
  - **Over-Budget Trigger**: If a transaction breaches the daily limit or pushes the monthly budget into deficit, AI automatically selects and flags **`😰 Stressed`** with an alert banner.
  - User can override or clear the mood with one tap.
- **Integration**: Real-time inside `ExpenseModal.tsx`.

---

### 7. Multimodal AI Receipt & Bill Scanner (`📸 AI Receipt Scanner`)
- **What it does**: Automatically extracts expense data from photos of paper receipts, digital bills, and restaurant checks.
- **Key Capabilities**:
  - Supports mobile camera capture and desktop image upload (JPEG, PNG, WEBP).
  - Multimodal Vision AI (`Gemini 1.5 Flash`, `GPT-4o-mini`, `Claude 3.5 Haiku`) parses:
    - **Merchant / Store Title**
    - **Grand Total Amount**
    - **Transaction Date**
    - **Suggested Category**
    - **Payment Mode** (UPI, Card, Cash)
    - **Detected Mood**
    - **Item Notes**
  - Auto-fills the entire Expense Modal in 1 click!
- **Endpoint**: `POST /api/v1/ai/scan-receipt`

---

### Architecture & Provider Independence
- **Environment-Driven**: Active provider is controlled entirely via `AI_PROVIDER=gemini/openai/claude/rules`.
- **Zero Hardcoding**: All features dynamically adapt to the active model.
- **Offline / Zero-Cost Fallback**: If no API keys are provided or network errors occur, the built-in mathematical rules engine executes all features without crashing.
