# 🤖 AI Features — Expense Tracker (Merged Unique List)

1. **Natural Language "Quick Add"** — Parses plain text/voice sentences (e.g. "Uber 240 cash yesterday") into structured expense data: title, amount, date, payment mode, category.
2. **Smart Real-Time Auto-Categorization** — Suggests the best-matching category as the user types an expense title, based on their own custom categories.
3. **Multimodal Receipt & Bill Scanner (Vision OCR)** — Extracts merchant, amount, date, payment mode, and category from a photo/upload of a receipt or bill, then auto-fills the form.
4. **AI Financial Health Score & Insights** — Analyzes spending trends and budget status to generate a 0–100 health score or color-coded insight cards, including category-wise month-end run-rate projections.
5. **Burn Rate & Budget Forecast** — Calculates daily spending pace, projects month-end total spend, and predicts the exact date a budget will be exhausted.
6. **Conversational AI Financial Assistant** — A chatbot grounded in the user's live financial data (RAG-style, scope-limited to finance topics) that answers natural-language questions like "Can I afford ₹3,000 dinner tonight?"
7. **Adaptive/Dynamic Budget Recommendations** — Analyzes past spending to suggest optimal monthly and daily budget limits, with a 1-click "Adopt" option.
8. **Subscription & Recurring Expense / Leak Audit** — Scans transaction history to detect recurring charges (Netflix, rent, gym) and small recurring "leak" purchases, flagging unused subscriptions and projecting their annualized cost.
9. **Anomaly Detection & Predictive Spending Forecast** — Flags unusual, duplicate, or abnormally large transactions, and forecasts future spending (overall and category-wise) based on historical data.
10. **Goal-Based Savings Planner** — Given a savings goal (amount + timeframe), generates a personalized plan with category-wise spending cuts.
11. **Emotion-Aware Mood Tracking** — Tracks and auto-detects the user's emotional state per expense (from title or manual entry), correlates mood with spending categories, and auto-flags "Stressed" with an alert when a transaction breaches budget.
12. **50/30/20 Budget Optimization Rule** — Auto-classifies expenses into Needs (50%), Wants (30%), and Savings (20%), and advises how to rebalance toward the target split.
13. **"Can I Afford This?" Purchase Simulator** — Simulates the impact of a prospective purchase on the monthly budget and gives a Safe/Caution/Over-Budget verdict before it's logged.
14. **Safe-to-Spend Speedometer** — A real-time widget showing the safe amount that can still be spent per day without breaking the budget, plus a depletion-date forecast.
15. **Visual Mood Representation** — Represents financial status visually through an animated mascot and/or emoji-based indicators (e.g. 😱 Distressed, 🥳 Thriving, 🧘 Zen) on dashboard/budget cards.
16. **Sentiment Analysis on Expense Notes** — Classifies the emotional tone of a transaction's notes (Positive/Neutral/Negative) and tags things like "Buyer's Remorse" or "Stress Spending."
17. **Alternate Expense Import (CSV & SMS Parsing)** — Imports bank CSV statements with auto column/category detection, and parses raw bank/UPI SMS text into structured expenses, with automatic masking of account/card numbers.
18. **Executive "Wrapped" Style Monthly Digest** — A Spotify-Wrapped-style monthly summary of spending milestones, achievements, and goals for the month.
19. **Multi-Tier Fuzzy Category Matcher** — Maps AI-suggested category text (e.g. "Groceries", "Uber") to the user's actual custom category names using a 3-tier strategy: exact match, substring match, then a keyword-dictionary lookup.
20. **Dynamic Category Auto-Creation** — If the AI-suggested category doesn't exist yet in the user's category list, prompts a "Category doesn't exist — Add & Select" banner that creates and selects it in one click.
21. **Duplicate Transaction Guard** — Checks whether a matching amount/description was already logged within a ±2 day window and warns the user before they accidentally submit a duplicate expense.
22. **Gamified Discipline Streaks & Achievements** — Tracks consecutive daily expense-logging streaks and unlocks bronze/silver/gold/diamond badges with motivational quotes.
23. **Financial Vibe Check / Roast Mode** — Shows a live emoji "vibe" status tied to burn rate (e.g. 🤑 "Living Large" vs 💀 "Down Bad") along with playful Hinglish roast-style commentary when overspending.
