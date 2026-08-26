import asyncio
import asyncpg
from app.config import get_settings
from scripts.create_db import parse_url

async def main():
    settings = get_settings()
    user, password, host, port, dbname = parse_url(settings.DATABASE_URL)
    conn = await asyncpg.connect(user=user, password=password, host=host, port=port, database=dbname)
    try:
        await conn.execute("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;")
        print("Column 'is_recurring' verified/added in database!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
