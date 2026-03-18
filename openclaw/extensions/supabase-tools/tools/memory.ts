import { Type, type Static } from '@sinclair/typebox';
import { getSupabase } from '../client.js';

const MEMORY_TABLE = 'memory';
const KNOWLEDGE_TABLE = 'public_knowledge';

const MemoryCategorySchema = Type.Union([
  Type.Literal('identity'), Type.Literal('situation'), Type.Literal('preference'),
  Type.Literal('relationship'), Type.Literal('lesson'),
]);

const MemoryTierSchema = Type.Union([
  Type.Literal('core'), Type.Literal('working'), Type.Literal('archival'),
]);

const KnowledgeCategorySchema = Type.Union([
  Type.Literal('formation'), Type.Literal('services'), Type.Literal('faq'),
  Type.Literal('free_courses'), Type.Literal('general'),
]);

function inferTier(category: string): string {
  if (category === 'identity') return 'core';
  if (category === 'lesson') return 'archival';
  return 'working';
}

// === MEMORY ===

export const memoryGetAllParams = Type.Object({
  tier: Type.Optional(MemoryTierSchema),
});

export async function memoryGetAll(params: Static<typeof memoryGetAllParams>): Promise<string> {
  const db = getSupabase();
  let query = db.from(MEMORY_TABLE).select().order('category').order('key');
  if (params.tier) query = query.eq('tier', params.tier);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to get memory: ${error.message}`);
  const entries = (data ?? []).map((m: Record<string, unknown>) => ({
    category: m.category, key: m.key, content: m.content, tier: m.tier,
  }));
  return JSON.stringify({ count: entries.length, entries });
}

export const memoryUpsertParams = Type.Object({
  category: MemoryCategorySchema,
  key: Type.String({ description: 'Cle unique dans la categorie' }),
  content: Type.String({ description: 'Contenu de la memoire' }),
  tier: Type.Optional(MemoryTierSchema),
});

export async function memoryUpsert(params: Static<typeof memoryUpsertParams>): Promise<string> {
  const db = getSupabase();
  const tier = params.tier ?? inferTier(params.category);
  const { data, error } = await db.from(MEMORY_TABLE).upsert({
    category: params.category, key: params.key, content: params.content,
    source: 'openclaw', tier, last_confirmed: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'category,key' }).select().single();
  if (error) throw new Error(`Failed to upsert memory: ${error.message}`);
  return JSON.stringify({ category: data.category, key: data.key, tier: data.tier, action: 'upserted' });
}

export const memoryDeleteParams = Type.Object({
  category: MemoryCategorySchema,
  key: Type.String({ description: 'Cle a supprimer' }),
});

export async function memoryDelete(params: Static<typeof memoryDeleteParams>): Promise<string> {
  const db = getSupabase();
  const { error } = await db.from(MEMORY_TABLE).delete().eq('category', params.category).eq('key', params.key);
  if (error) throw new Error(`Failed to delete memory: ${error.message}`);
  return JSON.stringify({ category: params.category, key: params.key, action: 'deleted' });
}

export const memorySearchParams = Type.Object({
  query: Type.String({ description: 'Texte de recherche' }),
  limit: Type.Optional(Type.Number({ description: 'Nombre max de resultats', default: 5 })),
});

export async function memorySearch(params: Static<typeof memorySearchParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from(MEMORY_TABLE).select()
    .or(`key.ilike.%${params.query}%,content.ilike.%${params.query}%`)
    .limit(params.limit ?? 5);
  if (error) throw new Error(`Failed to search memory: ${error.message}`);
  const results = (data ?? []).map((m: Record<string, unknown>) => ({
    category: m.category, key: m.key, content: m.content, tier: m.tier,
  }));
  return JSON.stringify({ query: params.query, count: results.length, results });
}

// === PUBLIC KNOWLEDGE ===

export const knowledgeGetAllParams = Type.Object({
  category: Type.Optional(KnowledgeCategorySchema),
});

export async function knowledgeGetAll(params: Static<typeof knowledgeGetAllParams>): Promise<string> {
  const db = getSupabase();
  let query = db.from(KNOWLEDGE_TABLE).select().order('category').order('key');
  if (params.category) query = query.eq('category', params.category);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to get knowledge: ${error.message}`);
  const entries = (data ?? []).map((k: Record<string, unknown>) => ({
    category: k.category, key: k.key, content: k.content,
  }));
  return JSON.stringify({ count: entries.length, entries });
}

export const knowledgeUpsertParams = Type.Object({
  category: KnowledgeCategorySchema,
  key: Type.String({ description: 'Cle unique' }),
  content: Type.String({ description: 'Contenu' }),
});

export async function knowledgeUpsert(params: Static<typeof knowledgeUpsertParams>): Promise<string> {
  const db = getSupabase();
  const { data, error } = await db.from(KNOWLEDGE_TABLE).upsert({
    category: params.category, key: params.key, content: params.content,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'category,key' }).select().single();
  if (error) throw new Error(`Failed to upsert knowledge: ${error.message}`);
  return JSON.stringify({ category: data.category, key: data.key, action: 'upserted' });
}

export const knowledgeDeleteParams = Type.Object({
  category: KnowledgeCategorySchema,
  key: Type.String({ description: 'Cle a supprimer' }),
});

export async function knowledgeDelete(params: Static<typeof knowledgeDeleteParams>): Promise<string> {
  const db = getSupabase();
  const { error } = await db.from(KNOWLEDGE_TABLE).delete().eq('category', params.category).eq('key', params.key);
  if (error) throw new Error(`Failed to delete knowledge: ${error.message}`);
  return JSON.stringify({ category: params.category, key: params.key, action: 'deleted' });
}
