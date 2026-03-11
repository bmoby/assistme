import { getSupabase } from './client.js';
import { logger } from '../logger.js';

export type MemoryCategory = 'identity' | 'situation' | 'preference' | 'relationship' | 'lesson';

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  key: string;
  content: string;
  confidence: number;
  source: string;
  last_confirmed: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'memory';

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
}): Promise<MemoryEntry> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .upsert(
      {
        category: params.category,
        key: params.key,
        content: params.content,
        source: params.source ?? 'conversation',
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

  logger.info({ category: params.category, key: params.key }, 'Memory updated');
  return data as MemoryEntry;
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
  logger.info({ category, key }, 'Memory deleted');
}
