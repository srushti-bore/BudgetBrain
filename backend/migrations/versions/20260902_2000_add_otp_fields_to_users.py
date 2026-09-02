"""add_otp_fields_to_users

Revision ID: 8b9c0d1e2f3a
Revises: 7a8b9c0d1e2f
Create Date: 2026-09-02 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b9c0d1e2f3a'
down_revision: Union[str, None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add otp_hash and otp_expires_at to users table if they don't already exist
    op.execute(
        """
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE users 
        DROP COLUMN IF EXISTS otp_hash,
        DROP COLUMN IF EXISTS otp_expires_at;
        """
    )
