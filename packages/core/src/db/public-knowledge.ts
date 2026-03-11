import { getSupabase } from './client.js';
import type { PublicKnowledge, PublicKnowledgeCategory } from '../types/index.js';
import { logger } from '../logger.js';

const TABLE = 'public_knowledge';

export async function getAllPublicKnowledge(): Promise<PublicKnowledge[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .order('category')
    .order('key');

  if (error) {
    logger.error({ error }, 'Failed to get public knowledge');
    throw error;
  }
  return (data ?? []) as PublicKnowledge[];
}

export async function getPublicKnowledgeByCategory(category: PublicKnowledgeCategory): Promise<PublicKnowledge[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('category', category)
    .order('key');

  if (error) {
    logger.error({ error, category }, 'Failed to get public knowledge by category');
    throw error;
  }
  return (data ?? []) as PublicKnowledge[];
}

export async function upsertPublicKnowledge(params: {
  category: PublicKnowledgeCategory;
  key: string;
  content: string;
}): Promise<PublicKnowledge> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .upsert(
      {
        category: params.category,
        key: params.key,
        content: params.content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'category,key' }
    )
    .select()
    .single();

  if (error) {
    logger.error({ error, params }, 'Failed to upsert public knowledge');
    throw error;
  }

  logger.info({ category: params.category, key: params.key }, 'Public knowledge updated');
  return data as PublicKnowledge;
}

export async function deletePublicKnowledge(category: PublicKnowledgeCategory, key: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('category', category)
    .eq('key', key);

  if (error) {
    logger.error({ error, category, key }, 'Failed to delete public knowledge');
    throw error;
  }
  logger.info({ category, key }, 'Public knowledge deleted');
}
