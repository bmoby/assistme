import { getSupabase } from '../client.js';
import type { StudentQuizAnswer } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'student_quiz_answers';

export async function saveAnswer(params: {
  session_id: string;
  question_id: string;
  student_answer: string;
  is_correct?: boolean | null;
  ai_evaluation?: Record<string, unknown> | null;
}): Promise<StudentQuizAnswer> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      session_id: params.session_id,
      question_id: params.question_id,
      student_answer: params.student_answer,
      is_correct: params.is_correct ?? null,
      ai_evaluation: params.ai_evaluation ?? null,
    })
    .select()
    .single();
  if (error) {
    logger.error({ error, sessionId: params.session_id, questionId: params.question_id }, 'Failed to save answer');
    throw error;
  }
  return data as StudentQuizAnswer;
}

export async function getAnswersBySession(sessionId: string): Promise<StudentQuizAnswer[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true });
  if (error) {
    logger.error({ error, sessionId }, 'Failed to get answers by session');
    throw error;
  }
  return (data ?? []) as StudentQuizAnswer[];
}
