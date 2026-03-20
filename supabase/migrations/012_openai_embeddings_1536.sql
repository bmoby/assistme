-- Migration 012: Switch from MiniLM-L6-v2 (384d) to OpenAI text-embedding-3-small (1536d)
-- Steps:
-- 1. Drop existing vector indexes (they reference old dimension)
-- 2. Clear all embeddings (must be regenerated with new model)
-- 3. Alter columns from vector(384) to vector(1536)
-- 4. Recreate indexes
-- 5. Update RPC functions with new dimension

-- ============================================
-- memory table
-- ============================================

DROP INDEX IF EXISTS idx_memory_embedding;

UPDATE memory SET embedding = NULL;

ALTER TABLE memory ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX idx_memory_embedding
  ON memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Update search_memory_semantic RPC
CREATE OR REPLACE FUNCTION search_memory_semantic(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  content TEXT,
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
    (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity
  FROM memory m
  WHERE m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update search_memory_hybrid RPC
CREATE OR REPLACE FUNCTION search_memory_hybrid(
  query_text TEXT,
  query_embedding vector(1536) DEFAULT NULL,
  match_count INT DEFAULT 5,
  match_tier TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.3,
  decay_half_life_days FLOAT DEFAULT 30.0,
  vector_weight FLOAT DEFAULT 0.6,
  text_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  content TEXT,
  tier TEXT,
  similarity FLOAT,
  text_rank FLOAT,
  decay_factor FLOAT,
  final_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  ts_query tsquery;
  decay_lambda FLOAT;
BEGIN
  ts_query := plainto_tsquery('simple', query_text);
  decay_lambda := ln(2.0) / decay_half_life_days;

  RETURN QUERY
  SELECT
    m.id,
    m.category,
    m.key,
    m.content,
    m.tier,
    CASE
      WHEN m.embedding IS NOT NULL AND query_embedding IS NOT NULL
      THEN (1 - (m.embedding <=> query_embedding))::FLOAT
      ELSE 0.0::FLOAT
    END AS similarity,
    CASE
      WHEN m.search_text IS NOT NULL AND ts_query != ''::tsquery
      THEN ts_rank_cd(m.search_text, ts_query)::FLOAT
      ELSE 0.0::FLOAT
    END AS text_rank,
    exp(-decay_lambda * EXTRACT(EPOCH FROM (NOW() - m.last_confirmed)) / 86400.0)::FLOAT AS decay_factor,
    (
      CASE
        WHEN m.embedding IS NOT NULL AND query_embedding IS NOT NULL
        THEN vector_weight * (1 - (m.embedding <=> query_embedding))
        ELSE 0.0
      END
      +
      CASE
        WHEN m.search_text IS NOT NULL AND ts_query != ''::tsquery
        THEN text_weight * ts_rank_cd(m.search_text, ts_query)::FLOAT
        ELSE 0.0
      END
    )::FLOAT * exp(-decay_lambda * EXTRACT(EPOCH FROM (NOW() - m.last_confirmed)) / 86400.0)::FLOAT AS final_score
  FROM memory m
  WHERE
    (match_tier IS NULL OR m.tier = match_tier)
    AND (
      (m.embedding IS NOT NULL AND query_embedding IS NOT NULL
        AND 1 - (m.embedding <=> query_embedding) > similarity_threshold)
      OR
      (m.search_text IS NOT NULL AND ts_query != ''::tsquery
        AND m.search_text @@ ts_query)
    )
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- formation_knowledge table
-- ============================================

DROP INDEX IF EXISTS idx_formation_knowledge_embedding;

UPDATE formation_knowledge SET embedding = NULL;

ALTER TABLE formation_knowledge ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX idx_formation_knowledge_embedding
  ON formation_knowledge USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Update search_formation_knowledge RPC
CREATE OR REPLACE FUNCTION search_formation_knowledge(
  query_text TEXT,
  query_embedding vector(1536) DEFAULT NULL,
  match_count INT DEFAULT 5,
  filter_module INT DEFAULT NULL,
  filter_session INT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.25,
  vector_weight FLOAT DEFAULT 0.6,
  text_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  session_number INT,
  module INT,
  content_type TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  source_file TEXT,
  similarity FLOAT,
  text_rank FLOAT,
  final_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  ts_query := plainto_tsquery('simple', query_text);

  RETURN QUERY
  SELECT
    fk.id,
    fk.session_number,
    fk.module,
    fk.content_type,
    fk.title,
    fk.content,
    fk.tags,
    fk.source_file,
    CASE
      WHEN fk.embedding IS NOT NULL AND query_embedding IS NOT NULL
      THEN (1 - (fk.embedding <=> query_embedding))::FLOAT
      ELSE 0.0::FLOAT
    END AS similarity,
    CASE
      WHEN fk.search_text IS NOT NULL AND ts_query != ''::tsquery
      THEN ts_rank_cd(fk.search_text, ts_query)::FLOAT
      ELSE 0.0::FLOAT
    END AS text_rank,
    (
      CASE
        WHEN fk.embedding IS NOT NULL AND query_embedding IS NOT NULL
        THEN vector_weight * (1 - (fk.embedding <=> query_embedding))
        ELSE 0.0
      END
      +
      CASE
        WHEN fk.search_text IS NOT NULL AND ts_query != ''::tsquery
        THEN text_weight * ts_rank_cd(fk.search_text, ts_query)::FLOAT
        ELSE 0.0
      END
    )::FLOAT AS final_score
  FROM formation_knowledge fk
  WHERE
    (filter_module IS NULL OR fk.module = filter_module)
    AND (filter_session IS NULL OR fk.session_number = filter_session)
    AND (filter_type IS NULL OR fk.content_type = filter_type)
    AND (
      (fk.embedding IS NOT NULL AND query_embedding IS NOT NULL
        AND 1 - (fk.embedding <=> query_embedding) > similarity_threshold)
      OR
      (fk.search_text IS NOT NULL AND ts_query != ''::tsquery
        AND fk.search_text @@ ts_query)
    )
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;
