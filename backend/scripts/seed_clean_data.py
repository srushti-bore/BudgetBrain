"""
BudgetBrain — Category Cleanup & Seed Script

1. Deletes dummy test categories starting with 'Cat_' and reassigns/cleans linked dummy data.
2. Seeds clean, realistic categories:
   - Food & Dining
   - Groceries
   - Transportation
   - Bills & Utilities
   - Shopping
   - Health & Fitness
   - Entertainment
   - Uncategorized (Protected System Category)
"""

import sys
from pathlib import Path

# Automatically ensure backend root directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
import uuid
from datetime import date, timedelta
from app.config import get_settings
from scripts.create_db import parse_url

async def seed_data():
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
        print(f"Connected to database '{dbname}'. Starting category cleanup & seeding...")

        # 1. Ensure Uncategorized system category exists
        uncat_row = await conn.fetchrow(
            "SELECT id FROM categories WHERE name = 'Uncategorized' OR is_system = true LIMIT 1"
        )

        if not uncat_row:
            uncat_str = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO categories (id, name, is_system, created_at, updated_at)
                VALUES ($1, 'Uncategorized', true, NOW(), NOW())
                """,
                uncat_str,
            )
            print("  [CREATED] Protected System Category 'Uncategorized'.")
        else:
            uncat_str = str(uncat_row['id'])
            print(f"  [OK] System Category 'Uncategorized' exists ({uncat_str}).")

        # 2. Reassign expenses linked to dummy categories (starting with 'Cat_') to Uncategorized
        dummy_cat_rows = await conn.fetch(
            "SELECT id FROM categories WHERE name LIKE 'Cat_%' AND is_system = false"
        )
        if dummy_cat_rows:
            for row in dummy_cat_rows:
                d_id = str(row['id'])
                await conn.execute(
                    "UPDATE expenses SET category_id = $1 WHERE category_id = $2",
                    uncat_str, d_id
                )
                await conn.execute(
                    "DELETE FROM categories WHERE id = $1",
                    d_id
                )
            print(f"  [CLEANED] Removed {len(dummy_cat_rows)} dummy test categories ('Cat_*').")

        # 3. List of realistic categories to seed
        target_categories = [
            "Food & Dining",
            "Groceries",
            "Transportation",
            "Bills & Utilities",
            "Shopping",
            "Health & Fitness",
            "Entertainment",
        ]

        for cat_name in target_categories:
            exists = await conn.fetchval("SELECT id FROM categories WHERE name = $1", cat_name)
            if not exists:
                c_str = str(uuid.uuid4())
                await conn.execute(
                    """
                    INSERT INTO categories (id, name, is_system, created_at, updated_at)
                    VALUES ($1, $2, false, NOW(), NOW())
                    """,
                    c_str, cat_name
                )
                print(f"  [SEEDED] Created Category '{cat_name}'.")
            else:
                print(f"  [OK] Category '{cat_name}' already exists.")

        # 4. Clean old expenses linked to dummy categories and add clean realistic expenses
        cats = await conn.fetch("SELECT id, name FROM categories WHERE is_system = false")
        cat_map = {r['name']: str(r['id']) for r in cats}

        sample_expenses = [
            ("Monthly House Rent", 18000.0, "Bills & Utilities", date.today() - timedelta(days=2), "Apartment rent", "upi"),
            ("Weekly Grocery Shopping", 3450.0, "Groceries", date.today() - timedelta(days=1), "Supermarket & vegetables", "card"),
            ("Fuel & Metro Pass", 1200.0, "Transportation", date.today(), "Petrol refill & metro smart card", "upi"),
            ("Dinner with Friends", 1650.0, "Food & Dining", date.today() - timedelta(days=3), "Weekend dinner", "card"),
            ("Electricity & Wi-Fi Bill", 2800.0, "Bills & Utilities", date.today() - timedelta(days=5), "Fiber broadband + power", "upi"),
            ("Gym Membership", 1500.0, "Health & Fitness", date.today() - timedelta(days=10), "Monthly fitness subscription", "card"),
        ]

        for title, amt, cat_n, exp_date, notes, p_mode in sample_expenses:
            if cat_n in cat_map:
                exp_exists = await conn.fetchval("SELECT id FROM expenses WHERE title = $1", title)
                if not exp_exists:
                    exp_str = str(uuid.uuid4())
                    await conn.execute(
                        """
                        INSERT INTO expenses (id, title, amount, category_id, date, notes, payment_mode, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                        """,
                        exp_str, title, amt, cat_map[cat_n], exp_date, notes, p_mode
                    )
                    print(f"  [EXPENSE] Logged '{title}'.")

        print("\nSeed & Cleanup completed successfully!\n")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
