import { getSupabase } from '../client.js';
import type { StudentExercise, ExerciseStatus, ReviewHistoryEntry } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'student_exercises';

export async function submitExercise(params: {
  student_id: string;
  session_id: string;
  module: number;
  exercise_number: number;
  submission_url: string;
  submission_type?: string;
}): Promise<StudentExercise> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      student_id: params.student_id,
      session_id: params.session_id,
      module: params.module,
      exercise_number: params.exercise_number,
      submission_url: params.submission_url,
      submission_type: params.submission_type ?? 'link',
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Duplicate submission: student already has an active submission for this session');
    }
    logger.error({ error, studentId: params.student_id }, 'Failed to submit exercise');
    throw error;
  }
  return data as StudentExercise;
}

export async function getExercise(id: string): Promise<StudentExercise | null> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select().eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, id }, 'Failed to get exercise');
    throw error;
  }
  return data as StudentExercise;
}

export async function getExercisesByStudent(studentId: string): Promise<StudentExercise[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('student_id', studentId)
    .order('module', { ascending: true })
    .order('exercise_number', { ascending: true });

  if (error) {
    logger.error({ error, studentId }, 'Failed to get exercises by student');
    throw error;
  }
  return (data ?? []) as StudentExercise[];
}

export async function getExercisesByModule(module: number): Promise<StudentExercise[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('module', module)
    .order('submitted_at', { ascending: false });

  if (error) {
    logger.error({ error, module }, 'Failed to get exercises by module');
    throw error;
  }
  return (data ?? []) as StudentExercise[];
}

export async function getExercisesByStatus(status: ExerciseStatus): Promise<StudentExercise[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', status)
    .order('submitted_at', { ascending: true });

  if (error) {
    logger.error({ error, status }, 'Failed to get exercises by status');
    throw error;
  }
  return (data ?? []) as StudentExercise[];
}

export async function getPendingExercises(): Promise<StudentExercise[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .in('status', ['submitted', 'ai_reviewed'])
    .order('submitted_at', { ascending: true });

  if (error) {
    logger.error({ error }, 'Failed to get pending exercises');
    throw error;
  }
  return (data ?? []) as StudentExercise[];
}

export async function updateExerciseStatus(
  id: string,
  status: ExerciseStatus,
  feedback?: string
): Promise<StudentExercise> {
  const db = getSupabase();
  const updates: Record<string, unknown> = { status };
  if (feedback) updates.feedback = feedback;
  if (status === 'reviewed' || status === 'approved' || status === 'revision_needed') {
    updates.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, id, status }, 'Failed to update exercise status');
    throw error;
  }
  return data as StudentExercise;
}

export async function updateExercise(
  id: string,
  updates: Partial<Omit<StudentExercise, 'id' | 'created_at'>>
): Promise<StudentExercise> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, id }, 'Failed to update exercise');
    throw error;
  }
  return data as StudentExercise;
}

export async function setAiReview(id: string, review: Record<string, unknown>): Promise<StudentExercise> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .update({
      ai_review: review,
      status: 'ai_reviewed',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ error, id }, 'Failed to set AI review');
    throw error;
  }
  return data as StudentExercise;
}

export async function getExerciseSummary(): Promise<{
  total: number;
  pending: number;
  approved: number;
  revision_needed: number;
}> {
  const db = getSupabase();
  const { data, error } = await db.from(TABLE).select('status');

  if (error) {
    logger.error({ error }, 'Failed to get exercise summary');
    throw error;
  }

  const exercises = (data ?? []) as Array<{ status: string }>;
  return {
    total: exercises.length,
    pending: exercises.filter((e) => e.status === 'submitted' || e.status === 'ai_reviewed').length,
    approved: exercises.filter((e) => e.status === 'approved').length,
    revision_needed: exercises.filter((e) => e.status === 'revision_needed').length,
  };
}

export async function getPendingExercisesBySession(sessionNumber: number): Promise<StudentExercise[]> {
  const db = getSupabase();

  // Step 1: Resolve session UUID from session number
  const { data: session, error: sessionError } = await db
    .from('sessions')
    .select('id')
    .eq('session_number', sessionNumber)
    .maybeSingle();

  if (sessionError) {
    logger.error({ error: sessionError, sessionNumber }, 'Failed to resolve session for pending exercises');
    throw sessionError;
  }

  if (!session) {
    return [];
  }

  // Step 2: Query exercises by session_id (uses indexed column)
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('session_id', session.id)
    .in('status', ['submitted', 'ai_reviewed'])
    .order('submitted_at', { ascending: true });

  if (error) {
    logger.error({ error, sessionNumber }, 'Failed to get pending exercises by session');
    throw error;
  }
  return (data ?? []) as StudentExercise[];
}

export async function getExerciseWithSession(exerciseId: string): Promise<StudentExercise | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('id', exerciseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, exerciseId }, 'Failed to get exercise with session');
    throw error;
  }
  return data as StudentExercise;
}

export async function getExerciseByStudentAndSession(
  studentId: string,
  sessionId: string
): Promise<StudentExercise | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .in('status', ['submitted', 'ai_reviewed'])
    .maybeSingle();

  if (error) {
    logger.error({ error, studentId, sessionId }, 'Failed to get exercise by student and session');
    throw error;
  }
  return data as StudentExercise | null;
}

export async function resubmitExercise(
  exerciseId: string,
  params: {
    submission_url: string | null;
    submission_type: string;
  }
): Promise<StudentExercise> {
  const db = getSupabase();

  // First, get current exercise to build history entry
  const { data: current, error: fetchError } = await db
    .from(TABLE)
    .select()
    .eq('id', exerciseId)
    .single();

  if (fetchError) {
    logger.error({ error: fetchError, exerciseId }, 'Failed to fetch exercise for resubmission');
    throw fetchError;
  }

  const exercise = current as StudentExercise;

  // Build history entry from current state
  const historyEntry: ReviewHistoryEntry = {
    reviewed_at: exercise.reviewed_at ?? new Date().toISOString(),
    status: exercise.status,
    feedback: exercise.feedback,
    ai_review: exercise.ai_review,
    submission_count: exercise.submission_count,
  };

  const updatedHistory = [...(exercise.review_history ?? []), historyEntry];

  // Update exercise for re-submission
  const { data, error } = await db
    .from(TABLE)
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      ai_review: null,
      feedback: null,
      reviewed_at: null,
      submission_url: params.submission_url,
      submission_type: params.submission_type,
      submission_count: exercise.submission_count + 1,
      review_history: updatedHistory,
      notification_message_id: null,
      review_thread_ai_message_id: null,  // clear so fresh placeholder gets new ID (D-09)
      // review_thread_id intentionally NOT cleared — thread persists for reuse (D-09)
    })
    .eq('id', exerciseId)
    .select()
    .single();

  if (error) {
    logger.error({ error, exerciseId }, 'Failed to resubmit exercise');
    throw error;
  }

  logger.info({ exerciseId, submissionCount: exercise.submission_count + 1 }, 'Exercise resubmitted');
  return data as StudentExercise;
}
