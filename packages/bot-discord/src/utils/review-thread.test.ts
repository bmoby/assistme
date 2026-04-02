/**
 * Unit tests for review-thread.ts :: createReviewThread
 *
 * Strategy:
 * - Mock @assistme/core and ./format.js to prevent real DB/Discord calls
 * - Create minimal Discord TextChannel and Client mock objects
 * - Test all code paths: new thread, thread reuse, deleted thread fallback,
 *   setArchived failure fallback, and AI review message inclusion
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mocks declared before imports (hoisted by Vitest)
vi.mock('@assistme/core');
vi.mock('./format.js', () => ({
  formatReviewThreadMessages: vi.fn().mockReturnValue({
    submissionMsg: 'Submission content',
    aiReviewMsg: null,
    historyMsg: null,
    imageUrl: null,
  }),
  formatStudentFeedbackDM: vi.fn().mockReturnValue('DM feedback text'),
  formatSubmissionNotification: vi.fn().mockReturnValue({ toJSON: () => ({}) }),
}));

import { createReviewThread } from './review-thread.js';
import {
  getSignedUrlsForExercise,
  updateExercise,
} from '@assistme/core';
import { createExercise, createStudent, createSession } from '../__mocks__/fixtures/domain/index.js';
import { resetSeq } from '../__mocks__/discord/builders.js';
import { formatReviewThreadMessages } from './format.js';

// ============================================
// Mock helpers
// ============================================

const mockGetSignedUrlsForExercise = vi.mocked(getSignedUrlsForExercise);
const mockUpdateExercise = vi.mocked(updateExercise);
const mockFormatReviewThreadMessages = vi.mocked(formatReviewThreadMessages);

// ============================================
// Discord object factories
// ============================================

/**
 * Creates a mock TextChannel with threads.create that returns a new thread.
 */
function makeTextChannel(threadId = 'new-thread-1', aiMsgId = 'ai-msg-1') {
  const mockThread = {
    id: threadId,
    send: vi.fn().mockImplementation(async (content: unknown) => {
      // Return the AI message ID for the placeholder send
      const text = typeof content === 'string' ? content : '';
      if (text.includes('Review IA') || text.includes('en cours')) {
        return { id: aiMsgId };
      }
      return { id: 'other-msg-1' };
    }),
    setArchived: vi.fn().mockResolvedValue(undefined),
  };

  const ch = {
    id: 'admin-ch-1',
    name: 'админ',
    threads: {
      create: vi.fn().mockResolvedValue(mockThread),
    },
    send: vi.fn().mockResolvedValue({ id: 'ch-msg-1' }),
    _mockThread: mockThread,
  };

  return ch;
}

/**
 * Creates a mock existing Discord thread for reuse tests.
 */
function makeExistingThread(threadId: string, aiMsgId = 'new-ai-msg') {
  return {
    id: threadId,
    isThread: () => true,
    setArchived: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockImplementation(async (content: unknown) => {
      const text = typeof content === 'string' ? content : '';
      if (text.includes('Review IA') || text.includes('en cours')) {
        return { id: aiMsgId };
      }
      return { id: 'sep-msg-1' };
    }),
  };
}

/**
 * Creates a mock Discord Client with configurable channels.fetch.
 */
function makeClient(fetchResult: unknown = null) {
  return {
    channels: {
      fetch: vi.fn().mockResolvedValue(fetchResult),
    },
  };
}

// ============================================
// Test suite
// ============================================

describe('createReviewThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();

    // Default mocks
    mockGetSignedUrlsForExercise.mockResolvedValue([]);
    mockUpdateExercise.mockResolvedValue(undefined as never);
    mockFormatReviewThreadMessages.mockReturnValue({
      submissionMsg: 'Submission content',
      aiReviewMsg: null,
      historyMsg: null,
      imageUrl: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Test 1: New thread creation (no existing review_thread_id)
  // ============================================

  it('creates a new thread and returns { threadId, aiMessageId } when review_thread_id is null', async () => {
    const exercise = createExercise({ id: 'ex-1', review_thread_id: null, submission_count: 1 });
    const student = createStudent({ id: 'student-1', name: 'Alice' });
    const session = createSession({ id: 'session-1' });
    const adminChannel = makeTextChannel('new-thread-1', 'ai-msg-1');
    const client = makeClient(null);

    const result = await createReviewThread(
      adminChannel as never,
      exercise,
      student,
      session,
      client as never,
    );

    // Thread created via adminChannel.threads.create
    expect(adminChannel.threads.create).toHaveBeenCalledOnce();

    // Returns correct IDs (aiMessageId is null — no AI placeholder)
    expect(result).toMatchObject({
      threadId: 'new-thread-1',
      aiMessageId: null,
    });

    // DB persistence: thread ID stored (no ai message ID)
    expect(mockUpdateExercise).toHaveBeenCalledWith('ex-1', {
      review_thread_id: 'new-thread-1',
    });
  });

  // ============================================
  // Test 2: Thread reuse on re-submission
  // ============================================

  it('reuses existing thread on re-submission: unarchives, sends separator, returns existing threadId', async () => {
    const existingThread = makeExistingThread('existing-thread', 'new-ai-msg');
    const exercise = createExercise({
      id: 'ex-2',
      review_thread_id: 'existing-thread',
      submission_count: 2,
    });
    const student = createStudent({ id: 'student-1', name: 'Bob' });
    const session = createSession({ id: 'session-1' });
    const adminChannel = makeTextChannel('would-be-new-thread', 'would-be-new-ai');
    const client = makeClient(existingThread);

    const result = await createReviewThread(
      adminChannel as never,
      exercise,
      student,
      session,
      client as never,
    );

    // setArchived(false) called to unarchive the thread
    expect(existingThread.setArchived).toHaveBeenCalledWith(false);

    // Separator message sent (contains Re-soumission #2)
    const sendCalls = existingThread.send.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'string' ? c[0] : ''
    );
    expect(sendCalls.some((msg: string) => msg.includes('Re-soumission #2'))).toBe(true);

    // adminChannel.threads.create NOT called (thread was reused)
    expect(adminChannel.threads.create).not.toHaveBeenCalled();

    // Returns the existing thread ID (aiMessageId is null — no AI placeholder)
    expect(result).toMatchObject({
      threadId: 'existing-thread',
      aiMessageId: null,
    });
  });

  // ============================================
  // Test 3: Deleted thread fallback — creates new thread
  // ============================================

  it('falls through to new thread creation when stored review_thread_id points to deleted thread', async () => {
    const exercise = createExercise({
      id: 'ex-3',
      review_thread_id: 'deleted-thread',
      submission_count: 1,
    });
    const student = createStudent({ id: 'student-1', name: 'Charlie' });
    const session = createSession({ id: 'session-1' });
    const adminChannel = makeTextChannel('fallback-thread', 'fallback-ai');
    // channels.fetch returns null — simulates deleted thread (catch returns null)
    const client = makeClient(null);

    const result = await createReviewThread(
      adminChannel as never,
      exercise,
      student,
      session,
      client as never,
    );

    // Falls through to new thread creation
    expect(adminChannel.threads.create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      threadId: 'fallback-thread',
      aiMessageId: null,
    });
  });

  // ============================================
  // Test 4: Thread reuse with setArchived failure — falls through to new thread
  // ============================================

  it('falls through to new thread creation when setArchived throws (permissions error)', async () => {
    const existingThread = makeExistingThread('perm-thread');
    // setArchived throws to simulate permission error
    existingThread.setArchived = vi.fn().mockRejectedValue(new Error('Missing Permissions'));

    const exercise = createExercise({
      id: 'ex-4',
      review_thread_id: 'perm-thread',
      submission_count: 2,
    });
    const student = createStudent({ id: 'student-1', name: 'Dave' });
    const session = createSession({ id: 'session-1' });
    const adminChannel = makeTextChannel('new-thread-perm', 'new-ai-perm');
    const client = makeClient(existingThread);

    const result = await createReviewThread(
      adminChannel as never,
      exercise,
      student,
      session,
      client as never,
    );

    // setArchived was attempted
    expect(existingThread.setArchived).toHaveBeenCalledWith(false);

    // Falls through to new thread creation
    expect(adminChannel.threads.create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      threadId: 'new-thread-perm',
      aiMessageId: null,
    });
  });

  // ============================================
  // Test 5: No AI message sent even when exercise has ai_review
  // ============================================

  it('does not send AI review message even when exercise.ai_review is set', async () => {
    const exercise = createExercise({
      id: 'ex-5',
      review_thread_id: null,
      ai_review: { score: 8, recommendation: 'approve' } as Record<string, unknown>,
      submission_count: 1,
    });
    const student = createStudent({ id: 'student-1', name: 'Eve' });
    const session = createSession({ id: 'session-1' });

    // formatReviewThreadMessages returns a real aiReviewMsg (but it should be ignored)
    mockFormatReviewThreadMessages.mockReturnValue({
      submissionMsg: 'Submission content',
      aiReviewMsg: 'Score IA: 8/10 — approve',
      historyMsg: null,
      imageUrl: null,
    });

    const mockThread = {
      id: 'new-thread-ai',
      send: vi.fn().mockResolvedValue({ id: 'other-msg' }),
      setArchived: vi.fn(),
    };
    const adminChannel = {
      id: 'admin-ch-1',
      name: 'админ',
      threads: {
        create: vi.fn().mockResolvedValue(mockThread),
      },
      send: vi.fn().mockResolvedValue({ id: 'ch-msg' }),
    };
    const client = makeClient(null);

    const result = await createReviewThread(
      adminChannel as never,
      exercise,
      student,
      session,
      client as never,
    );

    // No AI review or placeholder message sent
    const sendCalls = mockThread.send.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'string' ? c[0] : ''
    );
    expect(sendCalls.some((msg: string) => msg.includes('Score IA'))).toBe(false);
    expect(sendCalls.some((msg: string) => msg.includes('en cours'))).toBe(false);
    expect(sendCalls.some((msg: string) => msg.includes('Review IA'))).toBe(false);

    // Returns null for aiMessageId
    expect(result.threadId).toBe('new-thread-ai');
    expect(result.aiMessageId).toBeNull();
  });
});
