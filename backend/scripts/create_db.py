"""
BudgetBrain — Database Setup Script (v2)

Creates the 'budgetbrain' database and test database if they don't exist.
Reads all config from app.config (env-driven via .env).
Uses asyncpg directly — no shell password prompts.

Usage:
    python scripts/create_db.py
"""

import asyncio
import re
import sys


def parse_url(database_url: str) -> tuple[str, str, str, int, str]:
    """Parse asyncpg-style DATABASE_URL into components."""
    url = database_url.replace("postgresql+asyncpg://", "")
    # user:password@host:port/dbname
    match = re.match(r"([^:]+):([^@]*)@([^:/]+):?(\d*)/(.+)", url)
    if not match:
        raise ValueError(f"Cannot parse DATABASE_URL: {database_url}")
    user = match.group(1)
    password = match.group(2)
    host = match.group(3)
    port = int(match.group(4)) if match.group(4) else 5432
    dbname = match.group(5)
    return user, password, host, port, dbname


async def ensure_db(user: str, password: str, host: str, port: int, dbname: str) -> None:
    import asyncpg

    print(f"  Connecting to PostgreSQL at {host}:{port} as '{user}'...")
    conn = await asyncpg.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database="postgres",  # connect to admin db to create target db
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", dbname
        )
        if exists:
            print(f"  [OK] Database '{dbname}' already exists -- skipping.")
        else:
            await conn.execute(f'CREATE DATABASE "{dbname}"')
            print(f"  [CREATED] Database '{dbname}' created.")
    finally:
        await conn.close()


async def main() -> None:
    # Load settings via app config (reads from .env automatically)
    from app.config import get_settings
    settings = get_settings()

    print("\nBudgetBrain -- Database Setup")
    print("=" * 40)

    user, password, host, port, dbname = parse_url(settings.DATABASE_URL)

    # Create main database
    print(f"\n[1/2] Main database: '{dbname}'")
    await ensure_db(user, password, host, port, dbname)

    # Create test database
    test_dbname = f"{dbname}_test"
    print(f"\n[2/2] Test database: '{test_dbname}'")
    await ensure_db(user, password, host, port, test_dbname)

    print("\nDone! Database setup complete.\n")


if __name__ == "__main__":
    asyncio.run(main())
