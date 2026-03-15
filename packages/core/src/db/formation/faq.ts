import { getSupabase } from '../client.js';
import type { FaqEntry } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'faq_entries';

export async function getAllFaqEntries(): Promise<FaqEntry[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .order('times_used', { ascending: false });

  if (error) {
    logger.error({ error }, 'Failed to get FAQ entries');
    throw error;
  }
  return (data ?? []) as FaqEntry[];
}

export async function getFaqByCategory(category: string): Promise<FaqEntry[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('category', category)
    .order('times_used', { ascending: false });

  if (error) {
    logger.error({ error, category }, 'Failed to get FAQ by category');
    throw error;
  }
  return (data ?? []) as FaqEntry[];
}

export async function searchFaq(query: string): Promise<FaqEntry[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .or(`question.ilike.%${query}%,answer.ilike.%${query}%`)
    .order('times_used', { ascending: false });

  if (error) {
    logger.error({ error, query }, 'Failed to search FAQ');
    throw error;
  }
  return (data ?? []) as FaqEntry[];
}

export async function createFaqEntry(params: {
  question: string;
  answer: string;
  category?: string;
  created_by?: string;
}): Promise<FaqEntry> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      question: params.question,
      answer: params.answer,
      category: params.category ?? 'general',
      created_by: params.created_by ?? 'admin',
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, 'Failed to create FAQ entry');
    throw error;
  }
  return data as FaqEntry;
}

export async function incrementFaqUsage(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db.rpc('increment_faq_usage', { faq_id: id });

  if (error) {
    // Fallback: manual increment if RPC doesn't exist
    const { data: entry } = await db.from(TABLE).select('times_used').eq('id', id).single();
    if (entry) {
      await db.from(TABLE).update({ times_used: (entry as { times_used: number }).times_used + 1 }).eq('id', id);
    }
  }
}
