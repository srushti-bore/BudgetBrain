"""
BudgetBrain — FastAPI Application Entry Point

Registers:
  - CORS middleware
  - All routers under /api/v1
  - Global exception handlers
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.exceptions import register_exception_handlers
from app.routers import auth, health, categories, expenses, budgets, dashboard

settings = get_settings()


# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="BudgetBrain API",
    description=(
        "Personal Expense Tracker API — "
        "log expenses, manage categories, track budgets, view dashboard."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    debug=settings.APP_DEBUG,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────
register_exception_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
# Health check (available at /health and /api/v1/health)
app.include_router(health.router)

# Versioned API routes
API_V1 = "/api/v1"
app.include_router(health.router, prefix=API_V1)
app.include_router(auth.router, prefix=API_V1)
app.include_router(categories.router, prefix=API_V1)
app.include_router(expenses.router, prefix=API_V1)
app.include_router(budgets.router, prefix=API_V1)
app.include_router(dashboard.router, prefix=API_V1)

