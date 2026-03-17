-- Migration 007: Memory Embeddings for Semantic Search
-- Adds vector column to memory table for pgvector-based similarity search.

-- Enable the vector extension (requires superuser or supabase dashboard)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (384 dimensions for all-MiniLM-L6-v2)
ALTER TABLE memory ADD COLUMN IF NOT EXISTS embedding vector(384);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RPC function for semantic search
CREATE OR REPLACE FUNCTION search_memory(
  query_embedding vector(384),
  match_count INT DEFAULT 3,
  match_tier TEXT DEFAULT 'archival',
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  content TEXT,
  tier TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.category,
    m.key,
    m.content,
    m.tier,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memory m
  WHERE m.embedding IS NOT NULL
    AND m.tier = match_tier
    AND 1 - (m.embedding <=> query_embedding) > similarity_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
