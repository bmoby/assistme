-- Migration 010: Formation Knowledge Base for Semantic Search
-- Stores pedagogical content (lesson plans, concepts, exercises, research) with embeddings
-- for semantic search by the Discord DM Agent, FAQ Agent, and Exercise Reviewer.
-- Replicates the proven pattern from memory (007 + 008): pgvector + tsvector + hybrid search.

-- ============================================
-- Table
-- ============================================

CREATE TABLE IF NOT EXISTS formation_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number INTEGER,                -- NULL for cross-session content
  module INTEGER NOT NULL CHECK (module BETWEEN 1 AND 6),
  content_type TEXT NOT NULL CHECK (content_type IN (
    'lesson_plan', 'concept', 'exercise', 'research', 'pedagogical_note', 'setup_guide'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source_file TEXT NOT NULL,
  embedding vector(384),                 -- all-MiniLM-L6-v2
  search_text tsvector,                  -- auto-populated by trigger
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Upsert key: same source file + same title = same chunk
  UNIQUE (source_file, title)
);

-- ============================================
-- Indexes
-- ============================================

-- HNSW for fast approximate nearest neighbor (vector cosine)
CREATE INDEX IF NOT EXISTS idx_formation_knowledge_embedding
  ON formation_knowledge USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN for full-text search
CREATE INDEX IF NOT EXISTS idx_formation_knowledge_search_text
  ON formation_knowledge USING gin (search_text);

-- B-tree for common filters
CREATE INDEX IF NOT EXISTS idx_formation_knowledge_module
  ON formation_knowledge (module);

CREATE INDEX IF NOT EXISTS idx_formation_knowledge_session
  ON formation_knowledge (session_number)
  WHERE session_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_formation_knowledge_type
  ON formation_knowledge (content_type);

-- GIN for tags array
CREATE INDEX IF NOT EXISTS idx_formation_knowledge_tags
  ON formation_knowledge USING gin (tags);

-- ============================================
-- Trigger: auto-populate tsvector
-- ============================================

CREATE OR REPLACE FUNCTION formation_knowledge_update_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := to_tsvector('simple',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '') || ' ' ||
    array_to_string(coalesce(NEW.tags, '{}'), ' ')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_formation_knowledge_search_text ON formation_knowledge;
CREATE TRIGGER trg_formation_knowledge_search_text
  BEFORE INSERT OR UPDATE OF title, content, tags ON formation_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION formation_knowledge_update_search_text();

-- ============================================
-- RPC: Hybrid search (vector cosine + BM25 + filters)
-- ============================================

CREATE OR REPLACE FUNCTION search_formation_knowledge(
  query_text TEXT,
  query_embedding vector(384) DEFAULT NULL,
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
  -- Prepare full-text query (simple config for multilingual: French + Russian + English)
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
    -- Vector similarity (0 if no embedding)
    CASE
      WHEN fk.embedding IS NOT NULL AND query_embedding IS NOT NULL
      THEN 1 - (fk.embedding <=> query_embedding)
      ELSE 0.0
    END AS similarity,
    -- Full-text rank
    CASE
      WHEN fk.search_text IS NOT NULL AND ts_query != ''::tsquery
      THEN ts_rank_cd(fk.search_text, ts_query)
      ELSE 0.0
    END AS text_rank,
    -- Final combined score
    (
      CASE
        WHEN fk.embedding IS NOT NULL AND query_embedding IS NOT NULL
        THEN vector_weight * (1 - (fk.embedding <=> query_embedding))
        ELSE 0.0
      END
      +
      CASE
        WHEN fk.search_text IS NOT NULL AND ts_query != ''::tsquery
        THEN text_weight * ts_rank_cd(fk.search_text, ts_query)
        ELSE 0.0
      END
    ) AS final_score
  FROM formation_knowledge fk
  WHERE
    -- Module filter (optional)
    (filter_module IS NULL OR fk.module = filter_module)
    -- Session filter (optional)
    AND (filter_session IS NULL OR fk.session_number = filter_session)
    -- Type filter (optional)
    AND (filter_type IS NULL OR fk.content_type = filter_type)
    -- Must match at least one: vector similarity OR text match
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
