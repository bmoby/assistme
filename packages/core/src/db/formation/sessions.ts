import { getSupabase } from '../client.js';
import type { Session } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'sessions';

export async function createSession(session: {
  session_number: number;
  module: number;
  title: string;
  description?: string;
  exercise_title?: string;
  exercise_description?: string;
  expected_deliverables?: string;
  exercise_tips?: string;
  deadline?: string;
  discord_thread_id?: string;
  status?: 'draft' | 'published' | 'completed';
}): Promise<Session> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      session_number: session.session_number,
      module: session.module,
      title: session.title,
      description: session.description ?? null,
      exercise_title: session.exercise_title ?? null,
      exercise_description: session.exercise_description ?? null,
      expected_deliverables: session.expected_deliverables ?? null,
      exercise_tips: session.exercise_tips ?? null,
      deadline: session.deadline ?? null,
      discord_thread_id: session.discord_thread_id ?? null,
      status: session.status ?? 'draft',
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, session_number: session.session_number }, 'Failed to create session');
    throw error;
  }

  return data as Session;
}

export async function getSession(id: string): Promise<Session | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, id }, 'Failed to get session');
    throw error;
  }

  return data as Session;
}

export async function getSessionByNumber(sessionNumber: number): Promise<Session | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('session_number', sessionNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, sessionNumber }, 'Failed to get session by number');
    throw error;
  }

  return data as Session;
}

export async function getPublishedSessions(): Promise<Session[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', 'published')
    .order('session_number', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to get published sessions');
    throw error;
  }

  return (data ?? []) as Session[];
}

export async function getAllSessions(): Promise<Session[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .order('session_number', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to get all sessions');
    throw error;
  }

  return (data ?? []) as Session[];
}

export async function updateSession(
  id: string,
  updates: Partial<Omit<Session, 'id' | 'created_at'>>
): Promise<Session> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, id }, 'Failed to update session');
    throw error;
  }

  return data as Session;
}

export async function publishSession(id: string): Promise<Session> {
  return updateSession(id, { status: 'published' });
}

export async function getSessionsWithDeadlineIn(hours: number): Promise<Session[]> {
  const now = new Date();
  const target = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const windowStart = new Date(target.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(target.getTime() + 30 * 60 * 1000);

  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', 'published')
    .gte('deadline', windowStart.toISOString())
    .lte('deadline', windowEnd.toISOString());

  if (error) {
    logger.error({ error, hours }, 'Failed to get sessions with deadline');
    throw error;
  }

  return (data ?? []) as Session[];
}
