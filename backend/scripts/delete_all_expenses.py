"""
BudgetBrain — Delete All Expenses Script

Clears all expense entries from the PostgreSQL database while preserving categories and budgets.
"""

import asyncio
from app.config import get_settings
from scripts.create_db import parse_url

async def clear_expenses():
    import asyncpg
    settings = get_settings()
    user, password, host, port, dbname = parse_url(settings.DATABASE_URL)

    conn = await asyncpg.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database=dbname,
    )

    try:
        count_before = await conn.fetchval("SELECT COUNT(*) FROM expenses")
        await conn.execute("DELETE FROM expenses")
        print(f"Successfully deleted all {count_before} expense entries from database '{dbname}'.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(clear_expenses())
