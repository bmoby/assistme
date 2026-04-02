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

import { archiveExercisesBySession, getExerciseSummary } from './exercises.js';

// ---------------------------------------------------------------------------
// Helper: configure sequential mockDb.from() calls
// ---------------------------------------------------------------------------

function setupSequentialMockDb(calls: Array<{ table: string; operation: string; result: unknown }>): void {
  let callIndex = 0;
  mockDb.from.mockImplementation((table: string) => {
    const call = calls[callIndex];
    callIndex++;

    const chain = mockDb._chainable();

    if (!call || call.table !== table) {
      // Unexpected call -- return empty defaults
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.select = vi.fn().mockResolvedValue({ data: [], error: null });
      chain.update = vi.fn().mockReturnValue(chain);
      return chain;
    }

    if (call.operation === 'resolve-session') {
      // sessions table: .select('id').eq('session_number', N).maybeSingle()
      chain.maybeSingle = vi.fn().mockResolvedValue(call.result);
      return chain;
    }

    if (call.operation === 'count-exercises') {
      // student_exercises table: .select('id', { count: 'exact' }).eq('session_id', ...).in('status', [...])
      chain.in = vi.fn().mockResolvedValue(call.result);
      return chain;
    }

    if (call.operation === 'update-exercises') {
      // student_exercises table: .update({status: 'archived'}).eq('session_id', ...).in('status', [...])
      chain.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(call.result),
        }),
      });
      return chain;
    }

    if (call.operation === 'select-summary') {
      // student_exercises table: .select('status').neq('status', 'archived')
      chain.neq = vi.fn().mockResolvedValue(call.result);
      return chain;
    }

    return chain;
  });
}

// ---------------------------------------------------------------------------
// archiveExercisesBySession
// ---------------------------------------------------------------------------

describe('archiveExercisesBySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves session UUID from session number and archives matching exercises', async () => {
    setupSequentialMockDb([
      {
        table: 'sessions',
        operation: 'resolve-session',
        result: { data: { id: 'session-uuid-1' }, error: null },
      },
      {
        table: 'student_exercises',
        operation: 'count-exercises',
        result: { data: [{ id: 'ex-1' }, { id: 'ex-2' }, { id: 'ex-3' }], error: null, count: 3 },
      },
      {
        table: 'student_exercises',
        operation: 'update-exercises',
        result: { error: null },
      },
    ]);

    const result = await archiveExercisesBySession(5);

    expect(result).toEqual({ archived: 3 });
    // Verify sessions table was queried
    expect(mockDb.from).toHaveBeenCalledWith('sessions');
    // Verify exercises table was queried
    expect(mockDb.from).toHaveBeenCalledWith('student_exercises');
  });

  it('returns 0 when session not found', async () => {
    setupSequentialMockDb([
      {
        table: 'sessions',
        operation: 'resolve-session',
        result: { data: null, error: null },
      },
    ]);

    const result = await archiveExercisesBySession(999);

    expect(result).toEqual({ archived: 0 });
    // Should only query sessions table, not exercises
    expect(mockDb.from).toHaveBeenCalledTimes(1);
    expect(mockDb.from).toHaveBeenCalledWith('sessions');
  });

  it('only targets exercises in submitted, approved, revision_needed statuses', async () => {
    const inMock = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

    let callIndex = 0;
    mockDb.from.mockImplementation((table: string) => {
      callIndex++;
      const chain = mockDb._chainable();

      if (table === 'sessions') {
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'session-uuid-1' }, error: null });
        return chain;
      }

      if (table === 'student_exercises' && callIndex === 2) {
        // count query
        chain.in = inMock;
        return chain;
      }

      return chain;
    });

    await archiveExercisesBySession(1);

    // Verify the .in() call includes exactly the archivable statuses
    expect(inMock).toHaveBeenCalledWith('status', ['submitted', 'approved', 'revision_needed']);
  });

  it('returns the count of archived exercises', async () => {
    setupSequentialMockDb([
      {
        table: 'sessions',
        operation: 'resolve-session',
        result: { data: { id: 'session-uuid-2' }, error: null },
      },
      {
        table: 'student_exercises',
        operation: 'count-exercises',
        result: { data: [{ id: 'ex-1' }, { id: 'ex-2' }], error: null, count: 2 },
      },
      {
        table: 'student_exercises',
        operation: 'update-exercises',
        result: { error: null },
      },
    ]);

    const result = await archiveExercisesBySession(3);

    expect(result).toEqual({ archived: 2 });
  });

  it('returns 0 when no exercises match archivable statuses', async () => {
    setupSequentialMockDb([
      {
        table: 'sessions',
        operation: 'resolve-session',
        result: { data: { id: 'session-uuid-3' }, error: null },
      },
      {
        table: 'student_exercises',
        operation: 'count-exercises',
        result: { data: [], error: null, count: 0 },
      },
    ]);

    const result = await archiveExercisesBySession(7);

    expect(result).toEqual({ archived: 0 });
  });
});

// ---------------------------------------------------------------------------
// getExerciseSummary
// ---------------------------------------------------------------------------

describe('getExerciseSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes archived exercises from the total count', async () => {
    // Mock returns only non-archived exercises (because .neq filters them)
    setupSequentialMockDb([
      {
        table: 'student_exercises',
        operation: 'select-summary',
        result: {
          data: [
            { status: 'submitted' },
            { status: 'approved' },
            { status: 'revision_needed' },
          ],
          error: null,
        },
      },
    ]);

    const result = await getExerciseSummary();

    // Total should be 3 (archived excluded by .neq filter)
    expect(result.total).toBe(3);
    expect(result.pending).toBe(1);
    expect(result.approved).toBe(1);
    expect(result.revision_needed).toBe(1);
  });

  it('excludes archived exercises from approved count', async () => {
    setupSequentialMockDb([
      {
        table: 'student_exercises',
        operation: 'select-summary',
        result: {
          data: [
            { status: 'submitted' },
            { status: 'approved' },
            // No 'archived' row here because .neq('status', 'archived') filters it
          ],
          error: null,
        },
      },
    ]);

    const result = await getExerciseSummary();

    expect(result.approved).toBe(1);
    expect(result.total).toBe(2);
  });

  it('returns correct counts when no archived exercises exist (baseline)', async () => {
    setupSequentialMockDb([
      {
        table: 'student_exercises',
        operation: 'select-summary',
        result: {
          data: [
            { status: 'submitted' },
            { status: 'submitted' },
            { status: 'approved' },
            { status: 'approved' },
            { status: 'approved' },
            { status: 'revision_needed' },
          ],
          error: null,
        },
      },
    ]);

    const result = await getExerciseSummary();

    expect(result).toEqual({
      total: 6,
      pending: 2,
      approved: 3,
      revision_needed: 1,
    });
  });
});
