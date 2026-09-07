-- ==============================================================================
-- BudgetBrain — Supabase pgvector RAG Setup Script
-- 
-- Run this script in your Supabase Dashboard:
-- SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the expense_embeddings table
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

-- 3. High-performance indexes
CREATE INDEX IF NOT EXISTS ix_expense_embeddings_user_id 
    ON expense_embeddings (user_id);

CREATE INDEX IF NOT EXISTS ix_expense_embeddings_expense_id 
    ON expense_embeddings (expense_id);

-- HNSW cosine index for sub-millisecond semantic similarity search
CREATE INDEX IF NOT EXISTS ix_expense_embeddings_vector_hnsw 
    ON expense_embeddings USING hnsw (embedding vector_cosine_ops);

-- 4. Vector Similarity Match Function (Postgres RPC)
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
