import { getSupabase } from '../client.js';
import type { QuizQuestion } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'quiz_questions';

export async function getQuestionsByQuiz(quizId: string): Promise<QuizQuestion[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('quiz_id', quizId)
    .order('question_number', { ascending: true });

  if (error) {
    logger.error({ error, quizId }, 'Failed to get questions by quiz');
    throw error;
  }

  return (data ?? []) as QuizQuestion[];
}
