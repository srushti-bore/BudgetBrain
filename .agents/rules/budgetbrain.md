# BudgetBrain Workspace Rule & Conventions

## Mandatory First Response Rule
- Before executing any task or delivering any response to the user, you MUST ALWAYS begin your response with: **"Hello Srush"**.
- Communicate primarily in English.

## Operating Principles
1. **Security & Environment**:
   - Zero hardcoded secrets, API keys, or credentials.
   - NEVER read, access, or commit `.env` files.
   - Dynamic configuration via `app.config.get_settings()`.
2. **Multi-Tenant Isolation**:
   - Every database query for expenses, budgets, categories, or analytics must strictly filter by `user_id == current_user.id`.
3. **AI Architecture**:
   - Abstract `BaseLLMProvider` contract driven by `AI_PROVIDER` environment variable (`gemini`, `openai`, `anthropic`, `rules`).
   - Default primary model is `gemini-3.1-flash-lite` for high speed and Indic language fluency (Marathi, Hindi, English).
   - Support multilingual questions and mirror the user's language/script.
4. **UI & Viewport Layout**:
   - Keep bottom-right viewport quadrant dedicated to the floating AI button (`z-50`).
   - Keep PWA prompts on the bottom-left quadrant (`z-40`) to prevent click collision.
   - Chat modal rendered at `z-[70]`.
5. **Testing**:
   - Ensure all 55 backend pytest tests pass.
   - Ensure frontend Next.js production build passes with 0 errors.
6. **Documentation**:
   - Keep `progress.md`, `technicaldebt.md`, and `docs/` synchronized.
