"""
BudgetBrain — Health Check Router

GET /health — returns app and database connectivity status.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Returns the application and database health status.
    Used by deployment platforms to verify the service is running.
    """
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    return {
        "status": "ok",
        "database": db_status,
    }
