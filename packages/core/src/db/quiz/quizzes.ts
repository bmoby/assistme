import { getSupabase } from '../client.js';
import type { Quiz, QuizStatus } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'quizzes';

export async function createQuiz(params: {
  session_number: number;
  status?: QuizStatus;
  questions_data?: Record<string, unknown> | null;
  original_txt?: string | null;
}): Promise<Quiz> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      session_number: params.session_number,
      status: params.status ?? 'draft',
      questions_data: params.questions_data ?? null,
      original_txt: params.original_txt ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, sessionNumber: params.session_number }, 'Failed to create quiz');
    throw error;
  }
  return data as Quiz;
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, id }, 'Failed to get quiz');
    throw error;
  }
  return data as Quiz;
}

export async function getQuizBySession(sessionNumber: number): Promise<Quiz | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('session_number', sessionNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, sessionNumber }, 'Failed to get quiz by session');
    throw error;
  }
  return data as Quiz;
}

export async function getActiveQuizzes(): Promise<Quiz[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) {
    logger.error({ error }, 'Failed to get active quizzes');
    throw error;
  }
  return (data ?? []) as Quiz[];
}

export async function updateQuizStatus(id: string, status: QuizStatus): Promise<Quiz> {
  const db = getSupabase();
  const updates: Record<string, unknown> = { status };
  if (status === 'closed') {
    updates['closed_at'] = new Date().toISOString();
  }
  const { data, error } = await db
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error({ error, id, status }, 'Failed to update quiz status');
    throw error;
  }
  return data as Quiz;
}
