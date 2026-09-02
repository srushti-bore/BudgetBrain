"""add_auth_and_user_isolation

Revision ID: 7a8b9c0d1e2f
Revises: 936d7ecfafe3
Create Date: 2026-08-31 19:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, None] = '936d7ecfafe3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    # 1. Create users table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            hashed_password VARCHAR(255),
            full_name VARCHAR(100),
            avatar_url VARCHAR(500),
            google_id VARCHAR(100) UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT true,
            is_verified BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id)")

    # 2. Create refresh_tokens table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked BOOLEAN NOT NULL DEFAULT false,
            user_agent VARCHAR(255),
            ip_address VARCHAR(45),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens(token_hash)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at ON refresh_tokens(expires_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_revoked ON refresh_tokens(revoked)")

    # Insert default seed user to link any existing rows seamlessly
    op.execute(
        f"""
        INSERT INTO users (id, email, full_name, is_active, is_verified)
        VALUES ('{DEFAULT_USER_ID}', 'default@budgetbrain.com', 'Default User', true, true)
        ON CONFLICT (id) DO NOTHING
        """
    )

    # 3. Add user_id to categories
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)")
    op.execute(f"UPDATE categories SET user_id = '{DEFAULT_USER_ID}' WHERE user_id IS NULL")
    op.execute("ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL")
    
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key CASCADE")
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_categories_name CASCADE")
    op.execute("DROP INDEX IF EXISTS ix_categories_name CASCADE")
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS fk_categories_user_id CASCADE")
    op.execute("ALTER TABLE categories ADD CONSTRAINT fk_categories_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
    
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_category_user_name CASCADE")
    op.execute("ALTER TABLE categories ADD CONSTRAINT uq_category_user_name UNIQUE (user_id, name)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_categories_user_id ON categories(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_categories_user_name ON categories(user_id, name)")


    # 4. Add user_id to expenses
    op.execute("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)")
    op.execute(f"UPDATE expenses SET user_id = '{DEFAULT_USER_ID}' WHERE user_id IS NULL")
    op.execute("ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL")
    
    op.execute("ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_user_id CASCADE")
    op.execute("ALTER TABLE expenses ADD CONSTRAINT fk_expenses_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
    
    op.execute("CREATE INDEX IF NOT EXISTS ix_expenses_user_id ON expenses(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_expenses_user_date ON expenses(user_id, date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_expenses_user_category ON expenses(user_id, category_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_expenses_user_amount ON expenses(user_id, amount)")

    # 5. Add user_id to budgets
    op.execute("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)")
    op.execute(f"UPDATE budgets SET user_id = '{DEFAULT_USER_ID}' WHERE user_id IS NULL")
    op.execute("ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL")
    
    op.execute("ALTER TABLE budgets DROP CONSTRAINT IF EXISTS fk_budgets_user_id CASCADE")
    op.execute("ALTER TABLE budgets ADD CONSTRAINT fk_budgets_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE")
    
    op.execute("ALTER TABLE budgets DROP CONSTRAINT IF EXISTS uq_budget_category_period CASCADE")
    op.execute("ALTER TABLE budgets DROP CONSTRAINT IF EXISTS uq_budget_user_category_period CASCADE")
    op.execute("DROP INDEX IF EXISTS uq_budget_overall_period")
    op.execute("DROP INDEX IF EXISTS uq_budget_user_overall_period")
    op.execute("""
        DELETE FROM budgets a USING budgets b
        WHERE a.id < b.id
          AND a.user_id = b.user_id
          AND a.period_type = b.period_type
          AND a.period_start = b.period_start
          AND a.category_id IS NULL AND b.category_id IS NULL
    """)
    op.execute("CREATE UNIQUE INDEX uq_budget_user_overall_period ON budgets(user_id, period_type, period_start) WHERE category_id IS NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_budgets_user_id ON budgets(user_id)")



def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_budget_user_overall_period")
    op.execute("ALTER TABLE budgets DROP CONSTRAINT IF EXISTS uq_budget_user_category_period CASCADE")
    op.execute("ALTER TABLE budgets DROP CONSTRAINT IF EXISTS fk_budgets_user_id CASCADE")
    op.execute("ALTER TABLE budgets DROP COLUMN IF EXISTS user_id")

    op.execute("ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_user_id CASCADE")
    op.execute("ALTER TABLE expenses DROP COLUMN IF EXISTS user_id")

    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_category_user_name CASCADE")
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS fk_categories_user_id CASCADE")
    op.execute("ALTER TABLE categories DROP COLUMN IF EXISTS user_id")

    op.execute("DROP TABLE IF EXISTS refresh_tokens CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
