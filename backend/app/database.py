"""
BudgetBrain — Async Database Engine & Session

Uses async SQLAlchemy 2.0 with asyncpg driver.
Engine & session factory are loop-scoped to ensure compatibility across threads
and event loops (e.g. FastAPI dev server, pytest-asyncio, Starlette TestClient).
"""

import asyncio
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

# ── Loop-scoped engine cache ──────────────────────────────────────────────────
_engine_cache = {}


def get_engine_and_factory():
    """
    Returns (engine, session_factory) bound to the current running event loop.
    Prevents cross-loop / cross-thread asyncpg connection crashes.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop not in _engine_cache:
        settings = get_settings()
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.APP_DEBUG,
            future=True,
        )
        session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        _engine_cache[loop] = (engine, session_factory)

    return _engine_cache[loop]


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an async database session.
    Use as a FastAPI dependency: Depends(get_db)
    Session is automatically closed after the request.
    """
    _, session_factory = get_engine_and_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
