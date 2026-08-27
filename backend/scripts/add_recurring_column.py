import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set in environment!")
        return

    # Convert postgresql+asyncpg:// to postgresql:// for raw asyncpg connection
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    print("Connecting to database...")
    conn = await asyncpg.connect(dsn=db_url)
    try:
        await conn.execute("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;")
        print("SUCCESS: Column 'is_recurring' verified/added to Supabase 'expenses' table!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
