-- Fix type mismatch in search_formation_knowledge:
-- ts_rank_cd() returns real (float4) but RETURNS TABLE declares FLOAT (float8).
-- Cast all computed columns to FLOAT explicitly.

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
