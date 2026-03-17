import { getSupabase } from './client.js';
import { logger } from '../logger.js';
import { getEmbedding } from '../ai/embeddings.js';
import { cacheGet, cacheSet, cacheDelete } from '../cache/redis.js';
import type { MemoryTier } from '../types/index.js';

const CACHE_KEY_CORE = 'memory:core';
const CACHE_KEY_WORKING = 'memory:working';
const CACHE_TTL_CORE = 300;    // 5 minutes (changes rarely)
const CACHE_TTL_WORKING = 120; // 2 minutes (more dynamic)

export type MemoryCategory = 'identity' | 'situation' | 'preference' | 'relationship' | 'lesson';

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  key: string;
  content: string;
  confidence: number;
  source: string;
  tier: MemoryTier;
  last_confirmed: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'memory';

// ---------- Tier inference ----------

function inferTier(category: MemoryCategory): MemoryTier {
  if (category === 'identity') return 'core';
  if (category === 'lesson') return 'archival';
  return 'working';
}

function defaultExpiresAt(tier: MemoryTier): string | null {
  if (tier === 'working') {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null; // core and archival don't expire
}

// ---------- Existing functions (preserved) ----------

export async function getAllMemory(): Promise<MemoryEntry[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .order('category')
    .order('key');

  if (error) {
    logger.error({ error }, 'Failed to get all memory');
    throw error;
  }
  return (data ?? []) as MemoryEntry[];
}

export async function getMemoryByCategory(category: MemoryCategory): Promise<MemoryEntry[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('category', category)
    .order('key');

  if (error) {
    logger.error({ error, category }, 'Failed to get memory by category');
    throw error;
  }
  return (data ?? []) as MemoryEntry[];
}

export async function getMemoryEntry(category: MemoryCategory, key: string): Promise<MemoryEntry | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('category', category)
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, category, key }, 'Failed to get memory entry');
    throw error;
  }
  return data as MemoryEntry;
}

export async function upsertMemory(params: {
  category: MemoryCategory;
  key: string;
  content: string;
  source?: string;
  tier?: MemoryTier;
  expires_at?: string | null;
}): Promise<MemoryEntry> {
  const db = getSupabase();
  const tier = params.tier ?? inferTier(params.category);
  const expires_at = params.expires_at !== undefined ? params.expires_at : defaultExpiresAt(tier);

  const { data, error } = await db
    .from(TABLE)
    .upsert(
      {
        category: params.category,
        key: params.key,
        content: params.content,
        source: params.source ?? 'conversation',
        tier,
        expires_at,
        last_confirmed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'category,key' }
    )
    .select()
    .single();

  if (error) {
    logger.error({ error, params }, 'Failed to upsert memory');
    throw error;
  }

  logger.info({ category: params.category, key: params.key, tier }, 'Memory updated');

  // Invalidate cache
  await Promise.all([cacheDelete(CACHE_KEY_CORE), cacheDelete(CACHE_KEY_WORKING)]);

  // Auto-embed in background (fire-and-forget)
  const entry = data as MemoryEntry;
  embedMemoryEntry(entry).catch((err) =>
    logger.debug({ err }, 'Background embedding failed (non-critical)')
  );

  return entry;
}

export async function deleteMemory(category: MemoryCategory, key: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('category', category)
    .eq('key', key);

  if (error) {
    logger.error({ error, category, key }, 'Failed to delete memory');
    throw error;
  }

  // Invalidate cache
  await Promise.all([cacheDelete(CACHE_KEY_CORE), cacheDelete(CACHE_KEY_WORKING)]);

  logger.info({ category, key }, 'Memory deleted');
}

// ---------- Tier-based functions ----------

export async function getMemoryByTier(tier: MemoryTier): Promise<MemoryEntry[]> {
  const db = getSupabase();
  let query = db
    .from(TABLE)
    .select()
    .eq('tier', tier)
    .order('category')
    .order('key');

  // For working tier, only return non-expired entries
  if (tier === 'working') {
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ error, tier }, 'Failed to get memory by tier');
    throw error;
  }
  return (data ?? []) as MemoryEntry[];
}

export async function getCoreMemory(): Promise<MemoryEntry[]> {
  const cached = await cacheGet<MemoryEntry[]>(CACHE_KEY_CORE);
  if (cached) return cached;

  const result = await getMemoryByTier('core');
  await cacheSet(CACHE_KEY_CORE, result, CACHE_TTL_CORE);
  return result;
}

export async function getWorkingMemory(): Promise<MemoryEntry[]> {
  const cached = await cacheGet<MemoryEntry[]>(CACHE_KEY_WORKING);
  if (cached) return cached;

  const result = await getMemoryByTier('working');
  await cacheSet(CACHE_KEY_WORKING, result, CACHE_TTL_WORKING);
  return result;
}

export async function getExpiredMemory(): Promise<MemoryEntry[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('tier', 'working')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to get expired memory');
    throw error;
  }
  return (data ?? []) as MemoryEntry[];
}

export async function moveToTier(category: MemoryCategory, key: string, newTier: MemoryTier): Promise<void> {
  const db = getSupabase();
  const updates: Record<string, unknown> = {
    tier: newTier,
    updated_at: new Date().toISOString(),
  };

  // Set/clear expires_at based on new tier
  if (newTier === 'working') {
    updates['expires_at'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    updates['expires_at'] = null;
  }

  const { error } = await db
    .from(TABLE)
    .update(updates)
    .eq('category', category)
    .eq('key', key);

  if (error) {
    logger.error({ error, category, key, newTier }, 'Failed to move memory to tier');
    throw error;
  }
  logger.info({ category, key, newTier }, 'Memory moved to tier');
}

// ---------- Temporal Decay ----------

const DECAY_HALF_LIFE_DAYS = 30;
const DECAY_LAMBDA = Math.LN2 / DECAY_HALF_LIFE_DAYS;

/** Compute decay factor: 1.0 for today, 0.5 at 30 days, 0.125 at 90 days */
export function computeDecay(lastConfirmed: string, halfLifeDays = DECAY_HALF_LIFE_DAYS): number {
  const ageMs = Date.now() - new Date(lastConfirmed).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const lambda = Math.LN2 / halfLifeDays;
  return Math.exp(-lambda * ageDays);
}

// ---------- Embedding & Semantic Search ----------

async function embedMemoryEntry(entry: MemoryEntry): Promise<void> {
  const text = `${entry.category}: ${entry.key} - ${entry.content}`;
  const embedding = await getEmbedding(text);
  if (!embedding) return; // server unavailable, skip silently

  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', entry.id);

  if (error) {
    logger.debug({ error, id: entry.id }, 'Failed to store embedding');
  }
}

export interface SemanticSearchResult {
  id: string;
  category: string;
  key: string;
  content: string;
  tier: string;
  similarity: number;
}

export async function searchMemorySemantic(
  queryEmbedding: number[],
  options?: { matchCount?: number; tier?: MemoryTier; threshold?: number }
): Promise<SemanticSearchResult[]> {
  const db = getSupabase();
  const { data, error } = await db.rpc('search_memory', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: options?.matchCount ?? 3,
    match_tier: options?.tier ?? 'archival',
    similarity_threshold: options?.threshold ?? 0.3,
  });

  if (error) {
    logger.error({ error }, 'Semantic memory search failed');
    return [];
  }
  return (data ?? []) as SemanticSearchResult[];
}

// ---------- Hybrid Search (BM25 + Vector + Temporal Decay) ----------

export interface HybridSearchResult {
  id: string;
  category: string;
  key: string;
  content: string;
  tier: string;
  similarity: number;
  text_rank: number;
  decay_factor: number;
  final_score: number;
}

export async function searchMemoryHybrid(
  queryText: string,
  queryEmbedding: number[] | null,
  options?: {
    matchCount?: number;
    tier?: MemoryTier | null;
    threshold?: number;
    vectorWeight?: number;
    textWeight?: number;
  }
): Promise<HybridSearchResult[]> {
  const db = getSupabase();
  const { data, error } = await db.rpc('search_memory_hybrid', {
    query_text: queryText,
    query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
    match_count: options?.matchCount ?? 5,
    match_tier: options?.tier ?? null,
    similarity_threshold: options?.threshold ?? 0.3,
    decay_half_life_days: DECAY_HALF_LIFE_DAYS,
    vector_weight: options?.vectorWeight ?? 0.6,
    text_weight: options?.textWeight ?? 0.4,
  });

  if (error) {
    logger.error({ error }, 'Hybrid memory search failed');
    return [];
  }
  return (data ?? []) as HybridSearchResult[];
}
