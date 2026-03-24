# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Status:** Not yet implemented

**Current state:**
- No test files exist in packages (`find packages -name "*.test.ts" -o -name "*.spec.ts"` returns empty)
- No jest.config.ts, vitest.config.ts, or similar test configuration files present
- No test dependencies in package.json files (jest, vitest, @testing-library not listed)
- No test scripts configured in any package.json (no `test`, `test:watch`, `test:coverage` commands)

**Recommendation for implementation:**
- Vitest recommended for TypeScript + ESM monorepo (faster, better ESM support than Jest)
- Jest alternative if org prefers established ecosystem
- Testing library not needed for backend Node.js code (agents, database modules)

## Run Commands (When Implemented)

Expected commands (based on root package.json pattern):
```bash
pnpm test                          # Run all tests in all packages
pnpm test:watch                    # Watch mode
pnpm test:coverage                 # Generate coverage report
pnpm -F @assistme/core test        # Test only core package
```

## Test Organization Approach (Inferred from Code Structure)

**Recommended Location:**
- Co-locate with source: `packages/core/src/__tests__/` or `packages/core/src/db/__tests__/`
- Alternative: parallel structure `packages/core/__tests__/` mirroring `src/`

**Naming Convention:**
- Test files paired with source: `tasks.ts` → `tasks.test.ts` or `tasks.spec.ts`
- Integration tests in separate directory: `__tests__/integration/`
- Unit tests beside source code: `src/db/tasks.test.ts`

**Test Suite Structure:**
```typescript
describe('createTask', () => {
  it('should create task with provided fields', () => {
    // Test implementation
  });

  it('should use default values for optional fields', () => {
    // Test implementation
  });

  it('should throw error if database operation fails', () => {
    // Test implementation
  });
});
```

## Testing Strategy (Recommended Based on Codebase)

**Unit Tests:**
- Database modules (`packages/core/src/db/*.ts`): Test CRUD operations, error handling, query filtering
- AI modules (`packages/core/src/ai/*.ts`): Test prompt building, JSON parsing, response handling
- Agent modules (`packages/core/src/agents/*.ts`): Test input validation, execution, output formatting
- Logger initialization, cache operations with mocked Redis

**Integration Tests:**
- Orchestrator with mocked Claude API: Test action parsing and execution
- Agent execution with mocked database: Test job creation, status updates, output handling
- Memory agent with mocked database: Test memory tier logic and update operations

**E2E Tests:**
- Not currently implemented
- Recommendation: Test full bot flows against test Telegram/Discord servers
- Use cases: command processing, voice transcription, cron job execution

## Mocking Strategy (Recommended)

**Framework:** Vitest built-in `vi.mock()` or use Sinon/Jest mocks

**What to Mock:**
- Supabase client: Mock `getSupabase()` return to test database operations without real DB
- Claude API: Mock `askClaude()` to test orchestrator logic without API calls
- External APIs: Google Calendar, OpenAI Whisper
- Node.js crypto for deterministic tests
- Redis client: Mock entirely or use local test instance

**Example mocking pattern (inferred from codebase structure):**
```typescript
import { vi } from 'vitest';
import * as dbModule from '../db/tasks';

vi.mock('../db/tasks', async () => ({
  createTask: vi.fn().mockResolvedValue({
    id: 'test-id',
    title: 'Test Task',
    // ... rest of task object
  }),
  getTask: vi.fn().mockResolvedValue(null),
}));
```

**What NOT to Mock:**
- TypeScript/Zod validation (test real type checking)
- Error handling logic (let real errors be thrown and caught)
- Logger calls (can assert logging occurred but let logger.error() run)
- Environment variable access (use test .env or process.env mocks)

## Fixtures and Test Data

**Recommended Location:** `packages/core/__tests__/fixtures/`

**Factory pattern (inferred from type design):**
```typescript
// factories/task.ts
export function createTaskFixture(overrides?: Partial<Task>): Task {
  return {
    id: 'task-123',
    title: 'Test Task',
    description: null,
    category: 'personal',
    priority: 'normal',
    status: 'todo',
    due_date: null,
    due_time: null,
    estimated_minutes: null,
    completed_at: null,
    source: 'test',
    related_id: null,
    related_type: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// factories/agent.ts
export function createAgentJobFixture(overrides?: Partial<AgentJob>): AgentJob {
  return {
    id: 'job-123',
    agent_name: 'artisan',
    input: { topic: 'Test', slideCount: 5 },
    origin: {
      platform: 'telegram',
      chatId: '123456',
      callerRole: 'admin',
    },
    status: 'pending',
    result_text: null,
    result_files: [],
    chain_to: null,
    error: null,
    parent_job_id: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}
```

## Coverage Targets (When Framework Implemented)

**Recommended minimums:**
- Core database modules: 80%+ (business-critical CRUD)
- Agent orchestrator: 75%+ (complex logic, error paths)
- AI modules: 70%+ (integration heavy, some external dependency)
- Utilities and helpers: 85%+
- Overall project target: 75%

**Coverage command:**
```bash
pnpm test:coverage
```

## Testing Priority by Module

**High Priority (test first):**
- `packages/core/src/db/tasks.ts` — Core task lifecycle
- `packages/core/src/db/memory.ts` — Memory tier logic
- `packages/core/src/agents/job-processor.ts` — Agent execution lifecycle
- `packages/core/src/ai/orchestrator.ts` — Action parsing and execution

**Medium Priority:**
- `packages/core/src/ai/formation/exercise-reviewer.ts` — Exercise grading logic
- `packages/core/src/agents/artisan/pptx-builder.ts` — Presentation generation
- `packages/core/src/cache/redis.ts` — Caching behavior

**Lower Priority (manual testing acceptable):**
- Bot handlers (grammY/discord.js integration) — test via running bots
- Cron jobs — test via scheduler validation
- Transcription pipeline — test with real audio samples

## Async Testing Pattern (Recommended)

```typescript
import { describe, it, expect } from 'vitest';

describe('async operations', () => {
  it('should handle promise resolution', async () => {
    const result = await createTask({ title: 'Test' });
    expect(result).toHaveProperty('id');
  });

  it('should handle promise rejection', async () => {
    await expect(
      createTask({ title: '' })
    ).rejects.toThrow('Title is required');
  });

  it('should run multiple async operations in parallel', async () => {
    const [task1, task2] = await Promise.all([
      createTask({ title: 'Task 1' }),
      createTask({ title: 'Task 2' }),
    ]);
    expect(task1.id).not.toBe(task2.id);
  });
});
```

## Error Testing Pattern (Recommended)

Based on observed error handling:

```typescript
describe('error handling', () => {
  it('should throw error with descriptive message', async () => {
    vi.mocked(getSupabase).mockReturnValueOnce({
      from: () => ({
        select: () => ({
          single: () => Promise.reject(new Error('DB error')),
        }),
      }),
    } as any);

    await expect(getTask('invalid')).rejects.toThrow('Failed to get task');
  });

  it('should return null for non-critical operations', async () => {
    vi.mocked(getSupabase).mockReturnValueOnce({
      from: () => ({
        get: () => Promise.reject(new Error('Cache miss')),
      }),
    } as any);

    const result = await cacheGet('key');
    expect(result).toBeNull();
  });

  it('should log errors with context', async () => {
    const logSpy = vi.spyOn(logger, 'error');

    vi.mocked(getSupabase).mockReturnValueOnce({
      from: () => ({
        select: () => Promise.reject(new Error('DB failed')),
      }),
    } as any);

    try {
      await getTask('123');
    } catch {
      // expected
    }

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: '123' }),
      expect.stringContaining('Failed to get task')
    );
  });
});
```

## JSON Parsing Tests (Recommended)

Given the pattern of parsing Claude responses in orchestrator:

```typescript
describe('JSON response parsing', () => {
  it('should parse valid JSON response', () => {
    const response = '{"actions": [], "response": "Done"}';
    const parsed = parseOrchestratorResponse(response);
    expect(parsed).toEqual({ actions: [], response: 'Done' });
  });

  it('should handle markdown-wrapped JSON', () => {
    const response = '```json\n{"actions": [], "response": "Done"}\n```';
    const parsed = parseOrchestratorResponse(response);
    expect(parsed).toEqual({ actions: [], response: 'Done' });
  });

  it('should gracefully degrade invalid JSON to plain text', () => {
    const response = 'Plain text response';
    const parsed = parseOrchestratorResponse(response);
    expect(parsed).toEqual({ response: 'Plain text response', actions: [] });
  });
});
```

## Validation Testing (Recommended)

Given Zod usage:

```typescript
describe('Zod validation', () => {
  it('should validate correct agent input', () => {
    const input = { topic: 'AI', slideCount: 10, details: 'Advanced' };
    const parsed = ArtisanInputSchema.parse(input);
    expect(parsed.topic).toBe('AI');
  });

  it('should throw on missing required fields', () => {
    const input = { slideCount: 10 };
    expect(() => ArtisanInputSchema.parse(input)).toThrow();
  });

  it('should use defaults for optional fields', () => {
    const input = { topic: 'AI' };
    const parsed = ArtisanInputSchema.parse(input);
    expect(parsed.slideCount).toBeUndefined(); // or default if defined
  });

  it('should enforce type constraints', () => {
    const input = { topic: 'AI', slideCount: 100 }; // exceeds max(50)
    expect(() => ArtisanInputSchema.parse(input)).toThrow();
  });
});
```

## Database Module Testing (Recommended)

```typescript
describe('tasks.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should insert task with all provided fields', async () => {
      const mockDb = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'task-1', title: 'Test' },
          error: null,
        }),
      };

      const result = await createTask({ title: 'Test', category: 'personal' });
      expect(result.id).toBe('task-1');
    });

    it('should apply default values for missing optional fields', async () => {
      const result = await createTask({ title: 'Test' });
      // Verify defaults were applied
      expect(result.category).toBe('personal');
      expect(result.priority).toBe('normal');
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks ordered by priority and due_date', async () => {
      const results = await getTasksByStatus('todo');
      // Verify query was called with correct sorting
      expect(mockDb.order).toHaveBeenCalledWith('priority', expect.any(Object));
    });
  });
});
```

## Current Testing Gaps

**Critical untested code:**
- Orchestrator action execution (`packages/core/src/ai/orchestrator.ts`) — complex JSON parsing and action dispatch
- Agent job processor (`packages/core/src/agents/job-processor.ts`) — lifecycle management, retry logic
- Exercise reviewer (`packages/core/src/ai/formation/exercise-reviewer.ts`) — grading logic
- Memory agent (`packages/core/src/ai/memory-agent.ts`) — memory tier classification

**Recommendation:** Implement tests for these modules in Phase 3-4 when moving to Discord and content systems, as they're complex and mutation-prone.

---

*Testing analysis: 2026-03-24*
