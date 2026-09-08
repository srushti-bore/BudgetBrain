"""
BudgetBrain — FastAPI Application Entry Point

Registers:
  - CORS middleware
  - All routers under /api/v1
  - Global exception handlers
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse

from app.config import get_settings
from app.exceptions import register_exception_handlers
from app.routers import ai, auth, budgets, categories, dashboard, expenses, health

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
    allow_origin_regex=r"^(http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?|https:\/\/.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception handlers ────────────────────────────────────────────────────────
register_exception_handlers(app)

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
app.include_router(ai.router, prefix=API_V1)

# Root-level aliases (guarantees requests succeed whether /api/v1 prefix is present or omitted)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)
app.include_router(ai.router)


# ── Mobile App Download Landing Page ──────────────────────────────────────────
@app.get("/app", response_class=HTMLResponse)
@app.get("/download", response_class=HTMLResponse)
def app_download_landing():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download BudgetBrain Android App</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #0B0F19;
            color: #F8FAFC;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px 16px;
            text-align: center;
        }
        .card {
            background: #111827;
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 24px;
            padding: 36px 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .icon { font-size: 52px; margin-bottom: 12px; }
        .badge {
            display: inline-block;
            background: rgba(16, 185, 129, 0.15);
            color: #10B981;
            font-size: 12px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 999px;
            margin-bottom: 16px;
            letter-spacing: 0.5px;
        }
        h1 { font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px; }
        p { font-size: 14px; color: #94A3B8; margin-bottom: 28px; line-height: 1.5; }
        .download-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: #FFFFFF;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            padding: 16px 24px;
            border-radius: 14px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
            transition: transform 0.15s ease;
        }
        .download-btn:active { transform: scale(0.97); }
        .version-info {
            font-size: 12px;
            color: #64748B;
            margin-top: 18px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🧠</div>
        <div class="badge">NATIVE ANDROID APP</div>
        <h1>BudgetBrain</h1>
        <p>Your AI-powered personal financial tracker with instant bill scanning & smart budget recommendations.</p>
        <a href="https://github.com/srushti-bore/BudgetBrain/releases/download/v1.0.0-android/app-debug.apk" class="download-btn">
            <span>📥</span>
            <span>Download APK (19.6 MB)</span>
        </a>
        <div class="version-info">Version 1.0.0 • Android 7.0+ Compatible</div>
    </div>
</body>
</html>
"""


@app.get("/app.apk")
def download_app_apk():
    return RedirectResponse("https://github.com/srushti-bore/BudgetBrain/releases/download/v1.0.0-android/app-debug.apk", status_code=302)



