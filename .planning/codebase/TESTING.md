# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Runner:**
- Vitest 4.1.x
- Config: `vitest.config.ts` (root, workspace-style with `projects`)
- Pool: `forks` for all projects (process isolation)

**Assertion Library:**
- Vitest built-in (`expect`, `vi.fn()`, `vi.mock()`)

**Run Commands:**
```bash
pnpm test:unit          # Run all unit tests (core + bot-discord + bot-discord-quiz)
pnpm test               # Alias for test:unit
pnpm test:integration   # Run integration tests (requires local Supabase)
pnpm test:e2e           # Run E2E tests (requires Discord bots + Supabase)
pnpm test:watch         # Watch mode (all projects)
pnpm test:coverage      # Unit tests with coverage report
```

## Test Projects (Vitest Workspace)

The root `vitest.config.ts` defines 6 test projects:

| Project | Root | Include | Env Vars |
|---------|------|---------|----------|
| `core` | `packages/core` | `src/**/*.test.ts` | Placeholder API keys, `LOG_LEVEL=silent` |
| `bot-discord` | `packages/bot-discord` | `src/**/*.test.ts` | Placeholder Discord/API keys, `LOG_LEVEL=silent` |
| `bot-discord-quiz` | `packages/bot-discord-quiz` | `src/**/*.test.ts` | Placeholder quiz bot keys, `LOG_LEVEL=silent` |
| `core-integration` | `packages/core` | `src/**/*.integration.test.ts` | Real local Supabase key, 30s timeout |
| `bot-discord-integration` | `packages/bot-discord` | `src/**/*.integration.test.ts` | Real local Supabase key, 30s timeout |
| `e2e` | root | `test/e2e/**/*.e2e.test.ts` | From `.env.test`, 30s timeout, single fork |

All projects use `@assistme/core` path alias resolved to source (`packages/core/src/index.ts`), not built output.

## Test File Organization

**Location:** Co-located with source files (same directory).

**Naming Conventions:**
- Unit tests: `{module-name}.test.ts` next to `{module-name}.ts`
- Integration tests: `{module-name}.integration.test.ts` next to source
- E2E tests: `test/e2e/{flow-name}.e2e.test.ts`

**Test File Counts:**
- `packages/bot-discord/src/`: 17 test files
- `packages/bot-discord-quiz/src/`: 12 test files
- `packages/core/src/`: 9 test files (3 integration, 6 unit)
- `packages/bot-telegram/src/`: 0 test files (no tests)
- `packages/bot-telegram-public/src/`: 0 test files (no tests)
- `test/e2e/`: 3 test files

**Smoke Tests:**
- Each tested package has a `smoke.test.ts` verifying the test environment works:
  ```typescript
  // packages/core/src/smoke.test.ts
  describe('core: infrastructure smoke', () => {
    it('runs without crashing', () => { expect(true).toBe(true); });
    it('has access to fake env vars', () => {
      expect(process.env['SUPABASE_URL']).toBe('http://localhost:54321');
    });
  });
  ```
- `packages/bot-discord/src/__mocks__/mocks-smoke.test.ts` verifies Discord builder and Anthropic mock infrastructure

## Test Structure

**Suite Organization:**
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.mock() calls MUST come before imports of mocked modules
vi.mock('@assistme/core');
vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { functionUnderTest } from './module.js';
import { dependency } from '@assistme/core';

// ============================================
// Fixtures
// ============================================

const MOCK_STUDENT = { /* full object with all fields */ };

// ============================================
// Tests
// ============================================

describe('functionUnderTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('description of expected behavior', async () => {
    vi.mocked(dependency).mockResolvedValue(/* mock data */);
    const result = await functionUnderTest(/* args */);
    expect(result.field).toBe('expected');
    expect(dependency).toHaveBeenCalledWith(/* expected args */);
  });
});
```

**Section Separators:**
- Tests use `// ============================================` comment blocks to separate:
  - Mocks
  - Typed mocks (for `as MockedFunction` casting)
  - Fixtures / Helpers
  - Tests

## Mocking

**Framework:** Vitest built-in (`vi.mock()`, `vi.fn()`, `vi.mocked()`, `vi.hoisted()`)

### Mocking @assistme/core (most common)

For bot packages that import from `@assistme/core`:
```typescript
vi.mock('@assistme/core');
// Then cast to typed mock:
const mockedGetStudent = getStudent as MockedFunction<typeof getStudent>;
```

### Mocking Anthropic SDK (for agents in core)

Two approaches observed:

**Approach 1: vi.hoisted (used in core agent tests)**
```typescript
const { mockCreate, MockAnthropic } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(function () {
    return { messages: { create: mockCreate } };
  });
  return { mockCreate, MockAnthropic };
});

vi.mock('@anthropic-ai/sdk', () => ({ default: MockAnthropic }));
```
The `default` key is critical -- agents use `import Anthropic from '@anthropic-ai/sdk'` (default import).
`MockAnthropic` must use `function` syntax (not arrow) to be a valid constructor.

**Approach 2: Shared mock helper (used in bot-discord tests)**
```typescript
// packages/bot-discord/src/__mocks__/core/anthropic-mock.ts
import { mockAnthropicCreate, getAnthropicMockFactory } from '../__mocks__/core/anthropic-mock.js';
vi.mock('@anthropic-ai/sdk', () => getAnthropicMockFactory());
```
Provides `mockToolUseSequence()` and `mockMultiTurnSequence()` helpers for common patterns.

### Mocking Logger

Always mock to silence output and enable assertion:
```typescript
vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));
```

### Mocking Supabase DB (for DB module tests in core)

Uses a Proxy-based chainable mock:
```typescript
const chainable = () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = new Proxy(chain, {
    get(target, prop: string) {
      if (prop === 'then') return undefined; // prevent Promise detection
      if (!target[prop]) target[prop] = vi.fn().mockReturnValue(self);
      return target[prop];
    },
  });
  return self;
};

vi.mock('../client.js', () => ({
  getSupabase: () => ({ from: vi.fn().mockReturnValue(chainable()) }),
}));
```

**What to Mock:**
- All external API calls (Claude, Supabase, Discord, OpenAI)
- Logger (always)
- Config module when testing handlers (freeze channel/role names)
- File system operations

**What NOT to Mock:**
- Pure functions under test (Zod schemas, parsing logic, evaluation logic)
- Type definitions and constants

## Fixtures and Factories

**Domain Fixture Factories:**
Located in `packages/bot-discord/src/__mocks__/fixtures/domain/`:

```typescript
// packages/bot-discord/src/__mocks__/fixtures/domain/student.ts
export function createStudent(overrides: Partial<Student> = {}): Student {
  const id = seq++;
  return {
    id: `student-${id}`,
    name: `Test Student ${id}`,
    phone: null,
    discord_id: `discord-${id}`,
    session: 2,
    status: 'active',
    payment_status: 'paid',
    // ... all fields with sensible defaults
    ...overrides,
  };
}
```

Available factories: `createStudent()`, `createSession()`, `createExercise()`, `createFaqEntry()`
Barrel file: `packages/bot-discord/src/__mocks__/fixtures/domain/index.ts`
Each factory has `resetSeq()` for deterministic IDs. Call in `beforeEach`.

**Discord Object Builders:**
Located in `packages/bot-discord/src/__mocks__/discord/builders.ts`:

```typescript
const msg = new MessageBuilder()
  .withContent('Hello')
  .withMember(member)
  .inChannel('faq')
  .build();

const member = new GuildMemberBuilder()
  .withRole({ name: 'student' })
  .build();

const cmd = new CommandInteractionBuilder()
  .withMember(member)
  .withIntegerOption('number', 3)
  .withStringOption('title', 'Test')
  .build();

const btn = new ButtonInteractionBuilder()
  .withCustomId('review_open_abc')
  .build();
```

Uses `Object.create(DiscordClass.prototype)` for `instanceof` checks to pass.
All action methods (`reply`, `editReply`, `deferReply`, `react`, `send`) are `vi.fn()`.
ID generator with `resetSeq()` for deterministic test IDs.

**Inline Fixtures (in core agent tests):**
Core tests define fixture helpers directly in the test file:
```typescript
function makeToolUseResponse(toolName: string, toolInput: Record<string, unknown>) {
  return { id: 'msg_tool_use', type: 'message', role: 'assistant', content: [...], ... };
}
function makeTextResponse(text: string) {
  return { id: 'msg_final', type: 'message', role: 'assistant', content: [...], ... };
}
```

**Anthropic API Response Fixtures:**
JSON files at `packages/bot-discord/src/__mocks__/fixtures/anthropic/`:
- `faq-agent-match.json`, `faq-agent-low-confidence.json`
- `dm-agent-final-text.json`, `dm-agent-submission.json`, `dm-agent-tool-use.json`
- `tsarag-read-propose.json`

## Coverage

**Requirements:**
```typescript
// vitest.config.ts
thresholds: {
  'packages/bot-discord/src/handlers/**': {
    statements: 70, branches: 65, functions: 70, lines: 70,
  },
  'packages/core/src/ai/formation/**': {
    statements: 70, branches: 60, functions: 70, lines: 70,
  },
}
```

**View Coverage:**
```bash
pnpm test:coverage       # Generates text + html + lcov reports
```

**Provider:** v8

**Excluded from coverage:** `node_modules`, `dist`, config files, test files, `__mocks__`

## Test Types

### Unit Tests

**Scope:** Individual functions, handlers, agents, commands
**Location:** Co-located `*.test.ts` files
**Strategy:** Mock all external dependencies, test behavior through inputs/outputs and mock assertions

Key patterns:
- Test happy path, error paths, edge cases
- Verify mock calls with `expect(mock).toHaveBeenCalledWith(expect.objectContaining({...}))`
- Test guard clauses (auth checks, null checks, status validation)
- Test tool routing in agent loops

### Integration Tests

**Scope:** DB operations against real local Supabase
**Location:** `*.integration.test.ts` co-located in `packages/core/src/db/`
**Requirements:** Local Supabase running (`supabase start`)

**Global Setup:** `test/globalSetup.ts`
- Starts Supabase local stack
- Resets DB (applies all migrations)

**Integration Test Helpers:** `test/integration-helpers.ts`
```typescript
const TEST_RUN_ID = createTestRunId();           // UUID-prefixed for isolation
const adminDb = createTestClient();               // Service-role Supabase client
// ... seed data in beforeAll, cleanup in afterAll
await cleanupTestData(adminDb, 'table', 'column', TEST_RUN_ID);
```

**Data Isolation:** Each test file uses a unique `TEST_RUN_ID` prefix on data, cleaned up in `afterAll`.

Existing integration tests:
- `packages/core/src/db/formation/knowledge.integration.test.ts` -- BM25 search, vector search, module filtering
- `packages/core/src/db/formation/students.integration.test.ts`
- `packages/core/src/db/formation/exercises.integration.test.ts`
- `packages/core/src/ai/formation/dm-agent.integration.test.ts`

### E2E Tests

**Scope:** Full Discord bot flows with real Discord gateway connections
**Location:** `test/e2e/`
**Requirements:** Discord dev bot token, test user bot token, local Supabase
**Run:** `pnpm test:e2e` (manual trigger only in CI)

**Architecture:**
- Two Discord.js clients: `devBot` (the actual bot) and `testUserBot` (simulates a student)
- MSW (Mock Service Worker) intercepts HTTP requests to Anthropic API
- `test/msw-server.ts` provides mock handlers:
  ```typescript
  handlers.anthropicSuccess('Response text')
  handlers.anthropicToolUse('tool_name', { input })
  handlers.supabaseSelect('table', data)
  ```
- `test/e2e/helpers/fake-dm.ts` emits synthetic DM events
- `test/e2e/helpers/seed-e2e.ts` seeds test student data
- `test/e2e/helpers/wait-for-message.ts` waits for bot response with timeout

Existing E2E tests:
- `test/e2e/dm-student-flow.e2e.test.ts` -- student DM flow
- `test/e2e/exercise-submission.e2e.test.ts` -- exercise submission flow
- `test/e2e/faq-flow.e2e.test.ts` -- FAQ question/answer flow

## CI Integration

**Workflow:** `.github/workflows/test.yml`

**Unit Tests (every push, every PR):**
1. Checkout + pnpm install
2. `pnpm typecheck` (type check all packages)
3. `pnpm test:unit` (core + bot-discord + bot-discord-quiz)

**Integration Tests (PRs to main only):**
1. Checkout + pnpm install
2. `supabase start` (local Supabase with Docker)
3. `pnpm test:integration`

**E2E Tests (manual dispatch only):**
1. Checkout + pnpm install + Supabase
2. Write `.env.test` from GitHub secrets
3. `pnpm test:e2e`

**Node:** v20, pnpm v10
**Supabase Docker images cached** via `actions/cache@v4`

## Common Patterns

**Async Testing:**
```typescript
it('handles async operation', async () => {
  vi.mocked(getStudent).mockResolvedValue(MOCK_STUDENT);
  const result = await runDmAgent(context);
  expect(result.text).toContain('expected');
});
```

**Error Testing:**
```typescript
it('rejects on DB error', async () => {
  vi.mocked(createSession).mockRejectedValue(new Error('DB error'));
  await handleSession(interaction);
  expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Ошибка'));
});

it('throws on malformed input', async () => {
  mockAskClaude.mockResolvedValue('not json');
  await expect(parseQuizFromTxt('bad', 1)).rejects.toThrow();
});
```

**Testing Async Lock Queues:**
Some handlers use lock patterns where the event handler returns before processing completes:
```typescript
async function invokeAndWait(interaction: ButtonInteraction): Promise<void> {
  handleQuizAnswer(interaction); // Does NOT await
  for (let i = 0; i < 10; i++) await Promise.resolve(); // Drain microtask queue
  await new Promise((r) => setTimeout(r, 0));
}
```

**Testing Call Order:**
```typescript
it('defers before DB calls', async () => {
  await invokeAndWait(interaction);
  const deferOrder = (interaction.deferUpdate as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
  const dbOrder = mockGetQuizSession.mock.invocationCallOrder[0];
  expect(deferOrder).toBeLessThan(dbOrder!);
});
```

**State Cleanup:**
Many handlers expose `_clearStateForTesting()` to reset in-memory maps:
```typescript
import { _clearStateForTesting } from './dm-handler.js';
beforeEach(() => {
  vi.clearAllMocks();
  _clearStateForTesting();
});
```

## Test Gaps

**Not Tested:**
- `packages/bot-telegram/` -- 0 test files (20+ source files including handlers, commands, cron jobs)
- `packages/bot-telegram-public/` -- 0 test files (5 source files)
- `packages/core/src/ai/orchestrator.ts` -- no unit tests
- `packages/core/src/ai/memory-agent.ts` -- no unit tests
- `packages/core/src/ai/memory-consolidator.ts` -- no unit tests
- `packages/core/src/cache/redis.ts` -- no unit tests
- `packages/core/src/scheduler/` -- no unit tests
- `packages/core/src/google/meet.ts` -- no unit tests
- Most `packages/core/src/db/` modules outside `formation/` and `quiz/` -- no unit or integration tests

**Tested Well:**
- Discord bot handlers (dm-handler, faq, admin-handler, review-buttons)
- Discord admin commands (session, session-update, add-student, announce, approve, review, revision, student-list, create)
- Core formation agents (dm-agent, faq-agent, tsarag-agent)
- Quiz bot (parse-quiz, quiz-eval, quiz-answer, quiz-start, quiz-dm, quiz-close, quiz-create, quiz-flow, quiz-messages, auth)
- Core DB quiz modules (sessions)

---

*Testing analysis: 2026-03-31*
