import { getSupabase } from '../client.js';
import type { StudentQuizSession } from '../../types/index.js';
import { logger } from '../../logger.js';
import { QUIZ_EXPIRATION_MS } from '../../config/constants.js';

const TABLE = 'student_quiz_sessions';

export async function createQuizSession(params: {
  student_id: string;
  quiz_id: string;
}): Promise<StudentQuizSession> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      student_id: params.student_id,
      quiz_id: params.quiz_id,
      status: 'not_started',
      current_question: 0,
    })
    .select()
    .single();
  if (error) {
    logger.error({ error, studentId: params.student_id, quizId: params.quiz_id }, 'Failed to create quiz session');
    throw error;
  }
  return data as StudentQuizSession;
}

export async function getQuizSession(id: string): Promise<StudentQuizSession | null> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, id }, 'Failed to get quiz session');
    throw error;
  }
  return data as StudentQuizSession;
}

export async function getSessionsByQuiz(quizId: string): Promise<StudentQuizSession[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: true });
  if (error) {
    logger.error({ error, quizId }, 'Failed to get sessions by quiz');
    throw error;
  }
  return (data ?? []) as StudentQuizSession[];
}

export async function getActiveSessionByStudent(studentId: string): Promise<StudentQuizSession | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('student_id', studentId)
    .in('status', ['not_started', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, studentId }, 'Failed to get active session by student');
    throw error;
  }
  return data as StudentQuizSession;
}

export async function updateQuizSession(
  id: string,
  updates: Partial<Pick<StudentQuizSession, 'status' | 'current_question' | 'score' | 'started_at' | 'completed_at'>>
): Promise<StudentQuizSession> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error({ error, id }, 'Failed to update quiz session');
    throw error;
  }
  return data as StudentQuizSession;
}

/**
 * Close expired quiz sessions (D-01: 48h expiration).
 * 1. Find all active quizzes created more than 48h ago.
 * 2. For each: set quiz status to 'closed', set closed_at.
 * 3. For each in-progress session: calculate partial score, set status to 'expired_incomplete'.
 *
 * Score formula: (count of is_correct=true answers / total questions in quiz) * 100
 */
export async function closeExpiredQuizSessions(): Promise<{ closedQuizzes: number; expiredSessions: number }> {
  const db = getSupabase();
  const cutoff = new Date(Date.now() - QUIZ_EXPIRATION_MS).toISOString();

  // Step 1: Find active quizzes older than 48h
  const { data: expiredQuizzes, error: quizError } = await db
    .from('quizzes')
    .select('id')
    .eq('status', 'active')
    .lt('created_at', cutoff);

  if (quizError) {
    logger.error({ error: quizError }, 'Failed to find expired quizzes');
    throw quizError;
  }

  if (!expiredQuizzes || expiredQuizzes.length === 0) {
    return { closedQuizzes: 0, expiredSessions: 0 };
  }

  const quizIds = expiredQuizzes.map((q) => q.id as string);
  let expiredSessionCount = 0;

  for (const quizId of quizIds) {
    // Step 2: Close the quiz
    const { error: closeError } = await db
      .from('quizzes')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', quizId);

    if (closeError) {
      logger.error({ error: closeError, quizId }, 'Failed to close expired quiz');
      throw closeError;
    }

    // Step 3: Get total question count for this quiz
    const { count: totalQuestions, error: countError } = await db
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId);

    if (countError) {
      logger.error({ error: countError, quizId }, 'Failed to count quiz questions');
      throw countError;
    }

    // Step 4: Find in-progress sessions for this quiz
    const { data: activeSessions, error: sessionsError } = await db
      .from(TABLE)
      .select('id')
      .eq('quiz_id', quizId)
      .in('status', ['not_started', 'in_progress']);

    if (sessionsError) {
      logger.error({ error: sessionsError, quizId }, 'Failed to fetch active sessions');
      throw sessionsError;
    }

    if (!activeSessions || activeSessions.length === 0) continue;

    for (const session of activeSessions) {
      const sessionId = session.id as string;

      try {
        // Step 5: Count correct answers for this session
        const { count: correctCount, error: answerCountError } = await db
          .from('student_quiz_answers')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('is_correct', true);

        if (answerCountError) {
          logger.error({ error: answerCountError, sessionId }, 'Failed to count correct answers');
          continue;
        }

        const score = totalQuestions && totalQuestions > 0
          ? ((correctCount ?? 0) / totalQuestions) * 100
          : 0;

        // Step 6: Expire the session with partial score
        const { error: expireError } = await db
          .from(TABLE)
          .update({
            status: 'expired_incomplete',
            score,
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (expireError) {
          logger.error({ error: expireError, sessionId }, 'Failed to expire session');
          continue;
        }

        expiredSessionCount++;
      } catch (err) {
        logger.error({ err, sessionId }, 'Unexpected error expiring session');
        continue;
      }
    }
  }

  logger.info({ closedQuizzes: quizIds.length, expiredSessions: expiredSessionCount }, 'Expired quiz sessions closed');
  return { closedQuizzes: quizIds.length, expiredSessions: expiredSessionCount };
}
