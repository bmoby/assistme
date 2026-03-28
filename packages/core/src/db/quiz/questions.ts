import { getSupabase } from '../client.js';
import type { QuizQuestion, QuizQuestionType } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'quiz_questions';

export async function createQuizQuestion(params: {
  quiz_id: string;
  question_number: number;
  type: QuizQuestionType;
  question_text: string;
  choices: Record<string, string> | null;
  correct_answer: string;
  explanation: string | null;
}): Promise<QuizQuestion> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      quiz_id: params.quiz_id,
      question_number: params.question_number,
      type: params.type,
      question_text: params.question_text,
      choices: params.choices,
      correct_answer: params.correct_answer,
      explanation: params.explanation,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, quizId: params.quiz_id, questionNumber: params.question_number }, 'Failed to create quiz question');
    throw error;
  }
  return data as QuizQuestion;
}

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
