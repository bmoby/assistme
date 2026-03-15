import { getSupabase } from '../client.js';
import type { FormationEvent } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'events';

export async function createFormationEvent(params: {
  type: string;
  source: string;
  target?: string;
  data?: Record<string, unknown>;
}): Promise<FormationEvent> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      type: params.type,
      source: params.source,
      target: params.target ?? null,
      data: params.data ?? {},
      processed: false,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, type: params.type }, 'Failed to create formation event');
    throw error;
  }
  return data as FormationEvent;
}

export async function getUnprocessedEvents(target: string): Promise<FormationEvent[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('target', target)
    .eq('processed', false)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error({ error, target }, 'Failed to get unprocessed events');
    throw error;
  }
  return (data ?? []) as FormationEvent[];
}

export async function markEventProcessed(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .update({ processed: true })
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to mark event as processed');
    throw error;
  }
}
