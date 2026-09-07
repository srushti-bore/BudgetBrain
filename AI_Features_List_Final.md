# 🤖 AI Features — Expense Tracker (Merged Unique List)

1. **Natural Language "Quick Add"** — Parses plain text/voice sentences (e.g. "Uber 240 cash yesterday") into structured expense data: title, amount, date, payment mode, category. *(Roadmap)*
2. **Smart Real-Time Auto-Categorization** `[✅ LIVE]` — Suggests the best-matching category as the user types an expense title, based on their own custom categories.
3. **Multimodal Receipt & Bill Scanner (Vision OCR)** `[✅ LIVE]` — Extracts merchant, amount, date, payment mode, detected mood, and category from a photo/upload of a receipt or bill, with mobile camera capture, photo gallery selection, and desktop upload.
4. **AI Financial Health Score & Insights** `[✅ LIVE]` — Analyzes spending trends and budget status to generate insight cards with category-wise concentration and direct action buttons.
5. **Burn Rate & Budget Forecast** — Calculates daily spending pace, projects month-end total spend, and predicts the exact date a budget will be exhausted. *(Roadmap)*
6. **Conversational AI Financial Assistant (RAG Grounded)** `[✅ LIVE]` — A chatbot grounded in live financial data and historical transactions via **Supabase pgvector (768-dim Gemini embeddings)** with citations, interactive chat history, and native **Marathi/Hindi/English** support.
7. **Adaptive/Dynamic Budget Recommendations** `[✅ LIVE]` — Analyzes past spending to suggest optimal monthly and daily budget limits, with a 1-click **"Adopt"** option.
8. **Subscription & Recurring Expense / Leak Audit** — Scans transaction history to detect recurring charges (Netflix, rent, gym) and small recurring "leak" purchases, flagging unused subscriptions and projecting their annualized cost. *(Roadmap)*
9. **Anomaly Detection & Predictive Spending Forecast** — Flags unusual or abnormally large transactions, and forecasts future spending based on historical data. *(Roadmap)*
10. **Goal-Based Savings Planner** — Given a savings goal (amount + timeframe), generates a personalized plan with category-wise spending cuts. *(Roadmap)*
11. **Emotion-Aware Mood Tracking** `[✅ LIVE]` — Tracks and auto-detects emotional states per expense (😊 Happy, 😐 Normal, 😔 Sad, 😰 Stressed, 🤩 Excited), correlates mood with categories, and auto-flags **`😰 Stressed`** when a transaction breaches budget.
12. **50/30/20 Budget Optimization Rule** — Auto-classifies expenses into Needs (50%), Wants (30%), and Savings (20%), and advises how to rebalance toward the target split. *(Roadmap)*
13. **"Can I Afford This?" Purchase Simulator** — Simulates the impact of a prospective purchase on the monthly budget and gives a Safe/Caution/Over-Budget verdict before it's logged. *(Roadmap)*
14. **Safe-to-Spend Speedometer** — A real-time widget showing the safe amount that can still be spent per day without breaking the budget, plus a depletion-date forecast. *(Roadmap)*
15. **Visual Mood Representation** — Represents financial status visually through an animated mascot and/or emoji-based indicators on dashboard/budget cards. *(Roadmap)*
16. **Sentiment Analysis on Expense Notes** — Classifies the emotional tone of a transaction's notes and tags Remorse vs Satisfaction. *(Roadmap)*
17. **Alternate Expense Import (CSV & SMS Parsing)** — Imports bank CSV statements with auto column/category detection, and parses raw bank/UPI SMS text into structured expenses. *(Roadmap)*
18. **Executive "Wrapped" Style Monthly Digest** — A Spotify-Wrapped-style monthly summary of spending milestones, achievements, and goals for the month. *(Roadmap)*
19. **Multi-Tier Fuzzy Category Matcher** `[✅ LIVE]` — Maps AI-suggested category text to the user's actual custom category names using a 3-tier strategy: exact match, substring match, then keyword dictionary.
20. **Dynamic Category Auto-Creation** — If the AI-suggested category doesn't exist yet, prompts a "Category doesn't exist — Add & Select" banner that creates and selects it in one click. *(Roadmap)*
21. **Duplicate Transaction Guard** `[✅ LIVE]` — Checks whether a matching amount/description was already logged within a **±2 day window** with multi-tier title matching, debounced amber warning banner, and **"I Understand, Log Anyway"** acknowledgment before submission.
22. **Gamified Discipline Streaks & Achievements** — Tracks consecutive daily expense-logging streaks and unlocks badges with motivational quotes. *(Roadmap)*
23. **Financial Vibe Check / Roast Mode** — Shows a live emoji "vibe" status tied to burn rate along with playful Hinglish roast-style commentary when overspending. *(Roadmap)*

