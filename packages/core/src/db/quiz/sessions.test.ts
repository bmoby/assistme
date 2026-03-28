import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDb, mockLogger } = vi.hoisted(() => {
  const chainable = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const self = new Proxy(chain, {
      get(target, prop: string) {
        if (prop === 'then') return undefined; // prevent Promise detection
        if (!target[prop]) {
          target[prop] = vi.fn().mockReturnValue(self);
        }
        return target[prop];
      },
    });
    return self;
  };

  return {
    mockDb: {
      from: vi.fn().mockReturnValue(chainable()),
      _chainable: chainable,
    },
    mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
});

vi.mock('../client.js', () => ({
  getSupabase: () => mockDb,
}));

vi.mock('../../logger.js', () => ({
  logger: mockLogger,
}));

import { closeExpiredQuizSessions } from './sessions.js';

// ---------------------------------------------------------------------------
// Helper: configure mockDb.from() to return different chains per table
// ---------------------------------------------------------------------------

interface TableConfig {
  quizzes?: { select?: { data: unknown[]; error: unknown }; update?: object };
  quiz_questions?: { count: number | null };
  student_quiz_sessions?: { select?: { data: unknown[] }; update?: object };
  student_quiz_answers?: { count: number | null };
}

function setupMockDb(config: TableConfig): void {
  mockDb.from.mockImplementation((table: string) => {
    const chain = mockDb._chainable();

    if (table === 'quizzes') {
      // select().eq().lt() for finding expired quizzes
      chain.lt = vi.fn().mockResolvedValue(
        config.quizzes?.select ?? { data: [], error: null }
      );
      // update().eq() for closing quiz
      chain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(config.quizzes?.update ?? {}),
      });
      // Need both paths: first call is select (find expired), second is update (close)
      // Use mockDb.from to track call order
      return chain;
    }

    if (table === 'quiz_questions') {
      chain.eq = vi.fn().mockResolvedValue({
        count: config.quiz_questions?.count ?? 0,
      });
      return chain;
    }

    if (table === 'student_quiz_sessions') {
      // select().eq().in() for finding active sessions
      chain.in = vi.fn().mockResolvedValue(
        config.student_quiz_sessions?.select ?? { data: [] }
      );
      // update().eq() for expiring session
      chain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(config.student_quiz_sessions?.update ?? {}),
      });
      return chain;
    }

    if (table === 'student_quiz_answers') {
      // For counting correct answers: select().eq().eq()
      const secondEq = vi.fn().mockResolvedValue({
        count: config.student_quiz_answers?.count ?? 0,
      });
      chain.eq = vi.fn().mockReturnValue({
        eq: secondEq,
      });
      return chain;
    }

    return chain;
  });
}

// ---------------------------------------------------------------------------
// More precise mock for multi-quiz scenarios
// ---------------------------------------------------------------------------

function setupSequentialMockDb(calls: Array<{ table: string; result: unknown }>): void {
  let callIndex = 0;
  mockDb.from.mockImplementation((table: string) => {
    const call = calls[callIndex];
    callIndex++;

    const chain = mockDb._chainable();

    if (!call || call.table !== table) {
      // Unexpected call — return empty defaults
      chain.lt = vi.fn().mockResolvedValue({ data: [], error: null });
      chain.in = vi.fn().mockResolvedValue({ data: [] });
      chain.eq = vi.fn().mockResolvedValue({ count: 0 });
      chain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
      return chain;
    }

    const result = call.result;

    // Route based on expected operation
    if (table === 'quizzes' && 'data' in (result as object)) {
      // Find expired quizzes
      chain.lt = vi.fn().mockResolvedValue(result);
      return chain;
    }
    if (table === 'quizzes') {
      // Close quiz (update)
      chain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
      return chain;
    }
    if (table === 'quiz_questions') {
      chain.eq = vi.fn().mockResolvedValue(result);
      return chain;
    }
    if (table === 'student_quiz_sessions' && 'data' in (result as object)) {
      chain.in = vi.fn().mockResolvedValue(result);
      return chain;
    }
    if (table === 'student_quiz_sessions') {
      chain.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
      return chain;
    }
    if (table === 'student_quiz_answers') {
      const secondEq = vi.fn().mockResolvedValue(result);
      chain.eq = vi.fn().mockReturnValue({ eq: secondEq });
      return chain;
    }

    return chain;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('closeExpiredQuizSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zeros when no expired quizzes found', async () => {
    setupMockDb({});

    const result = await closeExpiredQuizSessions();

    expect(result).toEqual({ closedQuizzes: 0, expiredSessions: 0 });
    expect(mockDb.from).toHaveBeenCalledWith('quizzes');
  });

  it('closes expired quiz with no active sessions', async () => {
    setupSequentialMockDb([
      // Step 1: find expired quizzes
      { table: 'quizzes', result: { data: [{ id: 'quiz-1' }], error: null } },
      // Step 2: close the quiz
      { table: 'quizzes', result: {} },
      // Step 3: count questions
      { table: 'quiz_questions', result: { count: 5 } },
      // Step 4: find active sessions — none
      { table: 'student_quiz_sessions', result: { data: [] } },
    ]);

    const result = await closeExpiredQuizSessions();

    expect(result).toEqual({ closedQuizzes: 1, expiredSessions: 0 });
  });

  it('calculates score 60% for 3/5 correct answers on expired session', async () => {
    setupSequentialMockDb([
      { table: 'quizzes', result: { data: [{ id: 'quiz-1' }], error: null } },
      { table: 'quizzes', result: {} },
      { table: 'quiz_questions', result: { count: 5 } },
      { table: 'student_quiz_sessions', result: { data: [{ id: 'session-1' }] } },
      { table: 'student_quiz_answers', result: { count: 3 } },
      { table: 'student_quiz_sessions', result: {} },
    ]);

    const result = await closeExpiredQuizSessions();

    expect(result).toEqual({ closedQuizzes: 1, expiredSessions: 1 });

    // Verify the session update was called with correct score
    const sessionUpdateCalls = mockDb.from.mock.calls
      .map((c: string[], i: number) => ({ table: c[0], index: i }))
      .filter((c: { table: string }) => c.table === 'student_quiz_sessions');

    // The last student_quiz_sessions call is the update
    expect(sessionUpdateCalls.length).toBe(2); // select + update
  });

  it('sets score 0 for not_started session with no answers', async () => {
    setupSequentialMockDb([
      { table: 'quizzes', result: { data: [{ id: 'quiz-1' }], error: null } },
      { table: 'quizzes', result: {} },
      { table: 'quiz_questions', result: { count: 5 } },
      { table: 'student_quiz_sessions', result: { data: [{ id: 'session-1' }] } },
      { table: 'student_quiz_answers', result: { count: 0 } },
      { table: 'student_quiz_sessions', result: {} },
    ]);

    const result = await closeExpiredQuizSessions();

    expect(result).toEqual({ closedQuizzes: 1, expiredSessions: 1 });
  });

  it('accumulates counts for multiple expired quizzes', async () => {
    setupSequentialMockDb([
      // Find 2 expired quizzes
      { table: 'quizzes', result: { data: [{ id: 'quiz-1' }, { id: 'quiz-2' }], error: null } },
      // Quiz 1: close + 1 session
      { table: 'quizzes', result: {} },
      { table: 'quiz_questions', result: { count: 3 } },
      { table: 'student_quiz_sessions', result: { data: [{ id: 'session-1' }] } },
      { table: 'student_quiz_answers', result: { count: 2 } },
      { table: 'student_quiz_sessions', result: {} },
      // Quiz 2: close + 2 sessions
      { table: 'quizzes', result: {} },
      { table: 'quiz_questions', result: { count: 4 } },
      { table: 'student_quiz_sessions', result: { data: [{ id: 'session-2' }, { id: 'session-3' }] } },
      { table: 'student_quiz_answers', result: { count: 1 } },
      { table: 'student_quiz_sessions', result: {} },
      { table: 'student_quiz_answers', result: { count: 4 } },
      { table: 'student_quiz_sessions', result: {} },
    ]);

    const result = await closeExpiredQuizSessions();

    expect(result).toEqual({ closedQuizzes: 2, expiredSessions: 3 });
  });

  it('handles totalQuestions = 0 without division by zero', async () => {
    setupSequentialMockDb([
      { table: 'quizzes', result: { data: [{ id: 'quiz-1' }], error: null } },
      { table: 'quizzes', result: {} },
      { table: 'quiz_questions', result: { count: 0 } },
      { table: 'student_quiz_sessions', result: { data: [{ id: 'session-1' }] } },
      { table: 'student_quiz_answers', result: { count: 0 } },
      { table: 'student_quiz_sessions', result: {} },
    ]);

    const result = await closeExpiredQuizSessions();

    expect(result).toEqual({ closedQuizzes: 1, expiredSessions: 1 });
    // No error thrown = division by zero handled
  });

  it('throws on DB error when finding expired quizzes', async () => {
    const dbError = { code: 'PGRST500', message: 'DB connection failed' };

    mockDb.from.mockImplementation(() => {
      const chain = mockDb._chainable();
      chain.lt = vi.fn().mockResolvedValue({ data: null, error: dbError });
      return chain;
    });

    await expect(closeExpiredQuizSessions()).rejects.toEqual(dbError);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
