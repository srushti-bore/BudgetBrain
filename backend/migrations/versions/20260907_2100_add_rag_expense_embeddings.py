"""add_rag_expense_embeddings

Revision ID: a1b2c3d4e5f6
Revises: 9c0d1e2f3a4b
Create Date: 2026-09-07 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c0d1e2f3a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Check if pgvector is available in Postgres extensions (e.g. on Supabase)
    has_vector_ext = conn.execute(
        sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
    ).scalar()

    if has_vector_ext:
        # 1. Enable extension
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        
        # 2. Create table with native vector column
        op.execute(
            """
            CREATE TABLE IF NOT EXISTS expense_embeddings (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expense_id VARCHAR(36) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                embedding VECTOR(768) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                CONSTRAINT uq_expense_embeddings_expense_id UNIQUE (expense_id)
            );
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_expense_embeddings_user_id ON expense_embeddings (user_id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_expense_embeddings_expense_id ON expense_embeddings (expense_id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_expense_embeddings_vector_hnsw ON expense_embeddings USING hnsw (embedding vector_cosine_ops);")
        
        # 3. Create Postgres match function (RPC)
        op.execute(
            """
            CREATE OR REPLACE FUNCTION match_expenses(
                query_embedding VECTOR(768),
                match_threshold FLOAT DEFAULT 0.3,
                match_count INT DEFAULT 5,
                filter_user_id VARCHAR(36) DEFAULT NULL
            )
            RETURNS TABLE (
                id VARCHAR(36),
                expense_id VARCHAR(36),
                content TEXT,
                similarity FLOAT
            )
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RETURN QUERY
                SELECT
                    ee.id,
                    ee.expense_id,
                    ee.content,
                    (1 - (ee.embedding <=> query_embedding))::FLOAT AS similarity
                FROM expense_embeddings ee
                WHERE (filter_user_id IS NULL OR ee.user_id = filter_user_id)
                  AND (1 - (ee.embedding <=> query_embedding)) > match_threshold
                ORDER BY ee.embedding <=> query_embedding
                LIMIT match_count;
            END;
            $$;
            """
        )
    else:
        # Fallback table definition for environments without pgvector C binary
        op.execute(
            """
            CREATE TABLE IF NOT EXISTS expense_embeddings (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expense_id VARCHAR(36) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                embedding_json JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                CONSTRAINT uq_expense_embeddings_expense_id UNIQUE (expense_id)
            );
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_expense_embeddings_user_id ON expense_embeddings (user_id);")
        op.execute("CREATE INDEX IF NOT EXISTS ix_expense_embeddings_expense_id ON expense_embeddings (expense_id);")


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS match_expenses;")
    op.execute("DROP TABLE IF EXISTS expense_embeddings;")
