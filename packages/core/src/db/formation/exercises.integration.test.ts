import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  submitExercise,
  resubmitExercise,
  getExerciseByStudentAndSession,
  getPendingExercisesBySession,
} from './exercises.js';
import {
  createTestClient,
  createTestRunId,
  cleanupTestData,
} from '../../../../../test/integration-helpers.js';

const TEST_RUN_ID = createTestRunId();
const adminDb = createTestClient();

// Fixture student IDs (populated in beforeAll)
let studentId1: string;
let studentId2: string;
let studentId3: string;
let studentId4: string;

// Use a high session number to avoid collisions with real data
const sessionNumber = 9900 + Math.floor(Math.random() * 99);
const sessionId = randomUUID();

beforeAll(async () => {
  // Insert test students via adminDb (let DB generate UUIDs) and capture IDs
  const { data: s1, error: e1 } = await adminDb
    .from('students')
    .insert({
      discord_id: `${TEST_RUN_ID}-discord-1`,
      name: `${TEST_RUN_ID}-TestUser1`,
      session: 2,
      status: 'registered',
    })
    .select('id')
    .single();
  if (e1) throw new Error(`Failed to insert test student 1: ${e1.message}`);
  studentId1 = s1!.id;

  const { data: s2, error: e2 } = await adminDb
    .from('students')
    .insert({
      discord_id: `${TEST_RUN_ID}-discord-2`,
      name: `${TEST_RUN_ID}-TestUser2`,
      session: 2,
      status: 'registered',
    })
    .select('id')
    .single();
  if (e2) throw new Error(`Failed to insert test student 2: ${e2.message}`);
  studentId2 = s2!.id;

  const { data: s3, error: e3 } = await adminDb
    .from('students')
    .insert({
      discord_id: `${TEST_RUN_ID}-discord-3`,
      name: `${TEST_RUN_ID}-TestUser3`,
      session: 2,
      status: 'registered',
    })
    .select('id')
    .single();
  if (e3) throw new Error(`Failed to insert test student 3: ${e3.message}`);
  studentId3 = s3!.id;

  const { data: s4, error: e4 } = await adminDb
    .from('students')
    .insert({
      discord_id: `${TEST_RUN_ID}-discord-4`,
      name: `${TEST_RUN_ID}-TestUser4`,
      session: 2,
      status: 'registered',
    })
    .select('id')
    .single();
  if (e4) throw new Error(`Failed to insert test student 4: ${e4.message}`);
  studentId4 = s4!.id;

  // Insert test session (required by FK on student_exercises.session_id)
  const { error: sessionError } = await adminDb.from('sessions').insert({
    id: sessionId,
    module: 1,
    session_number: sessionNumber,
    title: `${TEST_RUN_ID}-TestSession`,
    status: 'draft',
  });
  if (sessionError) throw new Error(`Failed to insert test session: ${sessionError.message}`);
});

afterAll(async () => {
  // Clean up in reverse FK order: exercises first, then students and sessions
  // Delete exercises by student_id (exact UUID match, not prefix)
  for (const sid of [studentId1, studentId2, studentId3, studentId4]) {
    if (sid) {
      await adminDb.from('student_exercises').delete().eq('student_id', sid);
    }
  }
  // Delete students by name prefix
  await cleanupTestData(adminDb, 'students', 'name', TEST_RUN_ID);
  // Delete session by id
  const { error } = await adminDb.from('sessions').delete().eq('id', sessionId);
  if (error) {
    console.warn(`[cleanup] Failed to clean sessions for ${TEST_RUN_ID}:`, error.message);
  }
});

describe('exercises DB integration', () => {
  it('submitExercise stores session_id atomically in the INSERT', async () => {
    const ex = await submitExercise({
      student_id: studentId1,
      session_id: sessionId,
      module: 1,
      exercise_number: 1,
      submission_url: 'https://example.com/atomic-test',
    });

    expect(ex.id).toBeDefined();
    expect(ex.session_id).toBe(sessionId);

    // Read back directly from DB to confirm session_id is set (not null)
    const { data } = await adminDb
      .from('student_exercises')
      .select('session_id')
      .eq('id', ex.id)
      .single();
    expect(data!.session_id).toBe(sessionId);
  });

  it('partial unique index prevents duplicate active submissions for same student+session', async () => {
    // studentId1 already has an active submission from the previous test
    // Second insert with same student+session should fail with 23505
    await expect(
      submitExercise({
        student_id: studentId1,
        session_id: sessionId,
        module: 1,
        exercise_number: 2,
        submission_url: 'https://example.com/duplicate-test',
      })
    ).rejects.toThrow('Duplicate submission');
  });

  it('getExerciseByStudentAndSession returns exercise for existing student+session', async () => {
    const result = await getExerciseByStudentAndSession(studentId1, sessionId);
    expect(result).not.toBeNull();
    expect(result!.student_id).toBe(studentId1);
    expect(result!.session_id).toBe(sessionId);
  });

  it('getExerciseByStudentAndSession returns null for non-existent combination', async () => {
    const result = await getExerciseByStudentAndSession(
      '00000000-0000-0000-0000-000000000000',
      sessionId
    );
    expect(result).toBeNull();
  });

  it('getPendingExercisesBySession returns pending exercises for session number', async () => {
    // studentId1 already has a 'submitted' exercise for this session
    // Also insert one for studentId2
    await submitExercise({
      student_id: studentId2,
      session_id: sessionId,
      module: 1,
      exercise_number: 1,
      submission_url: 'https://example.com/pending-test',
    });

    const results = await getPendingExercisesBySession(sessionNumber);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((e) => e.session_id === sessionId)).toBe(true);
    expect(results.every((e) => e.status === 'submitted')).toBe(true);
  });

  it('getPendingExercisesBySession excludes approved exercises', async () => {
    // Insert an approved exercise directly (bypassing submitExercise to set status='approved')
    const { data: approvedEx, error } = await adminDb
      .from('student_exercises')
      .insert({
        student_id: studentId3,
        session_id: sessionId,
        module: 1,
        exercise_number: 1,
        submission_url: 'https://example.com/approved-test',
        submission_type: 'link',
        status: 'approved',
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to insert approved exercise: ${error.message}`);

    const results = await getPendingExercisesBySession(sessionNumber);
    const ids = results.map((e) => e.id);
    expect(ids).not.toContain(approvedEx!.id);
  });

  it('resubmitExercise preserves review_thread_id and clears review_thread_ai_message_id', async () => {
    // 1. Create initial exercise for studentId4
    const ex = await submitExercise({
      student_id: studentId4,
      session_id: sessionId,
      module: 1,
      exercise_number: 1,
      submission_url: 'https://example.com/thread-test',
    });

    // 2. Simulate admin opening review: set status='revision_needed', review_thread_id, review_thread_ai_message_id
    const { error: updateErr } = await adminDb
      .from('student_exercises')
      .update({
        status: 'revision_needed',
        review_thread_id: 'thread-abc',
        review_thread_ai_message_id: 'msg-xyz',
      })
      .eq('id', ex.id);
    if (updateErr) throw new Error(`Failed to update exercise for resubmit test: ${updateErr.message}`);

    // 3. Re-submit
    const result = await resubmitExercise(ex.id, {
      submission_url: null,
      submission_type: 'file',
    });

    // 4. Assert thread ID preserved, AI message ID cleared, other fields updated
    expect(result.review_thread_id).toBe('thread-abc');
    expect(result.review_thread_ai_message_id).toBeNull();
    expect(result.notification_message_id).toBeNull();
    expect(result.submission_count).toBeGreaterThan(1);
  });
});
