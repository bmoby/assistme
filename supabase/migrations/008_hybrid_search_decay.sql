-- Migration 008: Hybrid Search (BM25 + Vector) + Temporal Decay (OpenClaw-inspired)
-- Adds full-text search column for keyword matching,
-- and replaces search_memory with a hybrid version that applies temporal decay.

-- Add tsvector column for full-text search (supports French + Russian + English)
ALTER TABLE memory ADD COLUMN IF NOT EXISTS search_text tsvector;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_memory_search_text ON memory USING gin (search_text);

-- Auto-populate search_text on insert/update
CREATE OR REPLACE FUNCTION memory_update_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := to_tsvector('simple', coalesce(NEW.key, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memory_search_text ON memory;
CREATE TRIGGER trg_memory_search_text
  BEFORE INSERT OR UPDATE OF key, content ON memory
  FOR EACH ROW
  EXECUTE FUNCTION memory_update_search_text();

-- Backfill existing rows
UPDATE memory SET search_text = to_tsvector('simple', coalesce(key, '') || ' ' || coalesce(content, ''));

-- Replace search_memory with hybrid version (BM25 + vector + temporal decay)
CREATE OR REPLACE FUNCTION search_memory_hybrid(
  query_text TEXT,
  query_embedding vector(384) DEFAULT NULL,
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
  -- Prepare full-text query (simple config for multilingual support)
  ts_query := plainto_tsquery('simple', query_text);
  -- Decay constant: ln(2) / half_life
  decay_lambda := ln(2.0) / decay_half_life_days;

  RETURN QUERY
  SELECT
    m.id,
    m.category,
    m.key,
    m.content,
    m.tier,
    -- Vector similarity (0 if no embedding)
    CASE
      WHEN m.embedding IS NOT NULL AND query_embedding IS NOT NULL
      THEN 1 - (m.embedding <=> query_embedding)
      ELSE 0.0
    END AS similarity,
    -- Full-text rank
    CASE
      WHEN m.search_text IS NOT NULL AND ts_query != ''::tsquery
      THEN ts_rank_cd(m.search_text, ts_query)
      ELSE 0.0
    END AS text_rank,
    -- Temporal decay based on last_confirmed
    exp(-decay_lambda * EXTRACT(EPOCH FROM (NOW() - m.last_confirmed)) / 86400.0)::FLOAT AS decay_factor,
    -- Final combined score = (weighted_similarity + weighted_text_rank) * decay
    (
      CASE
        WHEN m.embedding IS NOT NULL AND query_embedding IS NOT NULL
        THEN vector_weight * (1 - (m.embedding <=> query_embedding))
        ELSE 0.0
      END
      +
      CASE
        WHEN m.search_text IS NOT NULL AND ts_query != ''::tsquery
        THEN text_weight * ts_rank_cd(m.search_text, ts_query)
        ELSE 0.0
      END
    ) * exp(-decay_lambda * EXTRACT(EPOCH FROM (NOW() - m.last_confirmed)) / 86400.0)::FLOAT AS final_score
  FROM memory m
  WHERE
    -- Tier filter (optional)
    (match_tier IS NULL OR m.tier = match_tier)
    -- Must match at least one: vector similarity OR text match
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
