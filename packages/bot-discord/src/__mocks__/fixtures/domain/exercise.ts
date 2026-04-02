import type { StudentExercise } from '@assistme/core';

let seq = 0;

export function resetSeq(): void {
  seq = 0;
}

export function createExercise(overrides: Partial<StudentExercise> = {}): StudentExercise {
  const id = seq++;
  return {
    id: `exercise-${id}`,
    student_id: 'student-1',
    module: 1,
    exercise_number: 1,
    submission_url: null,
    submission_type: 'file',
    submitted_at: new Date().toISOString(),
    ai_review: null,
    manual_review: null,
    status: 'submitted',
    reviewed_at: null,
    feedback: null,
    student_comment: null,
    session_id: 'session-1',
    submission_count: 1,
    review_history: [],
    notification_message_id: null,
    review_thread_id: null,
    review_thread_ai_message_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
