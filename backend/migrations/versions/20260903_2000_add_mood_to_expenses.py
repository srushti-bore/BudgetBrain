"""add_mood_to_expenses

Revision ID: 9c0d1e2f3a4b
Revises: 8b9c0d1e2f3a
Create Date: 2026-09-03 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c0d1e2f3a4b'
down_revision: Union[str, None] = '8b9c0d1e2f3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add optional mood column to expenses table if it doesn't already exist
    op.execute(
        """
        ALTER TABLE expenses 
        ADD COLUMN IF NOT EXISTS mood VARCHAR(20) NULL;
        """
    )
    # Add composite index on user_id and mood for high-speed emotional analytics
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_expenses_user_mood ON expenses (user_id, mood);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS ix_expenses_user_mood;
        ALTER TABLE expenses 
        DROP COLUMN IF EXISTS mood;
        """
    )
