import { getSupabase } from '../client.js';
import { logger } from '../../logger.js';
import { getEmbedding } from '../../ai/embeddings.js';
import type { FormationKnowledge, FormationKnowledgeContentType } from '../../types/index.js';

const TABLE = 'formation_knowledge';

// ============================================
// Upsert (with background embedding)
// ============================================

export async function upsertFormationKnowledge(params: {
  session_number?: number | null;
  module: number;
  content_type: FormationKnowledgeContentType;
  title: string;
  content: string;
  tags?: string[];
  source_file: string;
}): Promise<FormationKnowledge> {
  const db = getSupabase();

  const { data, error } = await db
    .from(TABLE)
    .upsert(
      {
        session_number: params.session_number ?? null,
        module: params.module,
        content_type: params.content_type,
        title: params.title,
        content: params.content,
        tags: params.tags ?? [],
        source_file: params.source_file,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source_file,title' }
    )
    .select()
    .single();

  if (error) {
    logger.error({ error, title: params.title, source_file: params.source_file }, 'Failed to upsert formation knowledge');
    throw error;
  }

  const entry = data as FormationKnowledge;

  // Auto-embed in background (fire-and-forget)
  embedKnowledgeEntry(entry).catch((err) =>
    logger.debug({ err }, 'Background embedding failed for knowledge entry (non-critical)')
  );

  return entry;
}

// ============================================
// Background embedding
// ============================================

async function embedKnowledgeEntry(entry: FormationKnowledge): Promise<void> {
  const text = `${entry.title}\n${entry.content}`;
  const embedding = await getEmbedding(text);
  if (!embedding) return;

  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', entry.id);

  if (error) {
    logger.debug({ error, id: entry.id }, 'Failed to store knowledge embedding');
  }
}

// ============================================
// Hybrid search (vector + BM25)
// ============================================

export interface KnowledgeSearchResult {
  id: string;
  session_number: number | null;
  module: number;
  content_type: string;
  title: string;
  content: string;
  tags: string[];
  source_file: string;
  similarity: number;
  text_rank: number;
  final_score: number;
}

export async function searchFormationKnowledge(
  queryText: string,
  queryEmbedding: number[] | null,
  options?: {
    matchCount?: number;
    module?: number | null;
    sessionNumber?: number | null;
    contentType?: FormationKnowledgeContentType | null;
    threshold?: number;
  }
): Promise<KnowledgeSearchResult[]> {
  const db = getSupabase();

  const { data, error } = await db.rpc('search_formation_knowledge', {
    query_text: queryText,
    query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
    match_count: options?.matchCount ?? 5,
    filter_module: options?.module ?? null,
    filter_session: options?.sessionNumber ?? null,
    filter_type: options?.contentType ?? null,
    similarity_threshold: options?.threshold ?? 0.25,
    vector_weight: 0.6,
    text_weight: 0.4,
  });

  if (error) {
    logger.error({ error }, 'Formation knowledge search failed');
    return [];
  }

  return (data ?? []) as KnowledgeSearchResult[];
}

// ============================================
// Direct access helpers
// ============================================

export async function getKnowledgeBySession(sessionNumber: number): Promise<FormationKnowledge[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('session_number', sessionNumber)
    .order('content_type')
    .order('title');

  if (error) {
    logger.error({ error, sessionNumber }, 'Failed to get knowledge by session');
    throw error;
  }
  return (data ?? []) as FormationKnowledge[];
}

export async function getKnowledgeByModule(module: number): Promise<FormationKnowledge[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('module', module)
    .order('session_number', { ascending: true, nullsFirst: false })
    .order('content_type')
    .order('title');

  if (error) {
    logger.error({ error, module }, 'Failed to get knowledge by module');
    throw error;
  }
  return (data ?? []) as FormationKnowledge[];
}
