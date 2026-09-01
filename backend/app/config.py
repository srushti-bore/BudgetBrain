"""
BudgetBrain — Application Configuration

All settings are driven by environment variables (via .env).
Never hardcode config values in source code.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    See .env.example for all required/optional variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str  # Required — no default (must be set in .env)

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,"
        "https://budget-brain-eight.vercel.app"
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── Authentication & Security ────────────────────────────────────────────
    JWT_SECRET_KEY: str = "budgetbrain-super-secret-jwt-key-development-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    COOKIE_SAMESITE: str = "lax"

    # ── Budget thresholds ─────────────────────────────────────────────────────
    # Configurable via env (SRS §3.6)
    BUDGET_NEAR_LIMIT_THRESHOLD: int = 80  # percentage

    # ── Pagination ───────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100



@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Use as a FastAPI dependency: Depends(get_settings)
    """
    return Settings()
