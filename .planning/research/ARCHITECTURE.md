# Architecture Patterns: Discord.js Bot Testing Infrastructure

**Domain:** Testing infrastructure for an existing Discord.js 14 bot in a pnpm monorepo
**Researched:** 2026-03-24
**Overall confidence:** MEDIUM-HIGH (Vitest/ESM patterns HIGH; Discord.js mock construction MEDIUM due to v14 private constructor constraints; Supabase integration patterns MEDIUM)

---

## Recommended Architecture

A three-tier test pyramid where each layer is independently runnable and has a clearly bounded dependency set. Unit tests have zero external dependencies. Integration tests depend on local Supabase (Docker) but mock all API clients. E2E tests depend on a real Discord dev bot and dev server.

```
┌─────────────────────────────────────────────────┐
│                  E2E Layer                      │
│  Real Discord dev bot + dev server + test DB    │
│  packages/bot-discord/src/**/*.e2e.test.ts      │
│  ~10 tests, slow (~60s), CI-optional            │
├─────────────────────────────────────────────────┤
│              Integration Layer                  │
│  Supabase local (Docker) + mock Claude API      │
│  packages/*/src/**/*.integration.test.ts        │
│  ~30 tests, medium (~30s), CI-required          │
├─────────────────────────────────────────────────┤
│                Unit Layer                       │
│  Pure TypeScript, all externals vi.mock()'d     │
│  packages/*/src/**/*.test.ts                    │
│  ~100 tests, fast (<5s), CI-required            │
└─────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Component 1: Vitest Root Config

**Responsibility:** Orchestrate all test projects, register globalSetup/teardown hooks for Docker services, define per-layer include/exclude patterns.

**Location:** `vitest.config.ts` (monorepo root)

**Communicates with:** All package-level configs via `projects:` array

**Key decisions:**
- Use `projects: ['packages/*']` glob so new packages are automatically included
- Define `globalSetup` that starts Supabase Docker only for integration runs (`VITEST_MODE=integration`)
- ESM requires `pool: 'forks'` or `pool: 'vmThreads'` — `'threads'` pool breaks ESM interop with native modules in Node.js 20

**Confidence:** HIGH — Vitest 3.x `projects` config is the documented pattern; `workspace` is deprecated since 3.2

---

### Component 2: Discord.js Mock Layer

**Responsibility:** Provide type-safe, reusable mock instances of Discord.js objects (Client, Guild, TextChannel, GuildMember, Message, CommandInteraction, ButtonInteraction) that never touch the Discord gateway.

**Location:** `packages/bot-discord/src/__tests__/mocks/discord/`

**Communicates with:** Unit test files (consumes mocks), fixture factories (uses mock primitives to build scenarios)

**Internal structure:**
```
mocks/discord/
  client.mock.ts          — Mock Client with stubbed .api and .guilds cache
  guild.mock.ts           — Mock Guild with populated .members and .channels
  message.mock.ts         — Mock Message with mock author, channel, guild
  interaction.mock.ts     — Mock CommandInteraction + ButtonInteraction
  channel.mock.ts         — Mock TextChannel with send() spy
  member.mock.ts          — Mock GuildMember with role collection
```

**Construction approach (MEDIUM confidence):**
Discord.js 14 uses private constructors for most classes. Three strategies exist:

1. Use `Reflect.construct(Discord.Guild, [client, rawData, 0])` to bypass private constructors — works for most classes but requires knowing the raw API payload shape. MEDIUM confidence as this relies on internal class structure.

2. Cast via `as unknown as Discord.Message` after building a plain object with all required fields — fast but loses type safety in the mock itself.

3. Use `@shoginn/discordjs-mock` npm package (v14-compatible) — less maintenance burden but adds a dependency and library may lag behind discord.js releases.

**Recommended strategy:** Build a minimal manual mock class using `Reflect.construct` for the objects used directly in your handlers (`Message`, `ButtonInteraction`, `ChatInputCommandInteraction`), and use plain objects cast to the type for secondary objects (User, Role). This is what the official discord.js discussions recommend. Do NOT use `jest-discordjs-mocks` — it targets Jest, not Vitest.

**Critical gotcha (HIGH confidence from official Discord.js discussion):** After creating a `GuildMember` mock, you MUST manually add it to `guild.members.cache.set(member.id, member)` or any internal collection lookup will trigger a real API call and fail.

---

### Component 3: Claude API Mock Layer

**Responsibility:** Intercept `@anthropic-ai/sdk` calls and return deterministic, controlled responses including tool-use sequences and streaming.

**Location:** `packages/core/src/__tests__/mocks/anthropic/`

**Communicates with:** Unit test files (agent tests), integration test files (agent-with-real-DB tests)

**Internal structure:**
```
mocks/anthropic/
  client.mock.ts          — vi.mock('@anthropic-ai/sdk') factory
  responses/
    tool-use.ts           — Factory for ToolUseBlock responses
    text.ts               — Factory for TextBlock responses
    sequences.ts          — Multi-turn conversation sequences
```

**Implementation approach (HIGH confidence):**
Use `vi.mock('@anthropic-ai/sdk')` at the module level. The SDK's `Anthropic` class needs its `messages.create()` method stubbed to return controlled message objects.

```typescript
// packages/core/src/__tests__/mocks/anthropic/client.mock.ts
import { vi } from 'vitest'

export const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))
```

For tool-use agent tests, `mockCreate` returns a sequence: first a `tool_use` stop_reason with tool call blocks, then a `end_turn` stop_reason with the final text. Use `mockCreate.mockResolvedValueOnce()` chains.

For the `runDmAgent` tool loop (max 5 iterations), you need up to 5 sequential `mockResolvedValueOnce()` calls. Build sequence factories so tests do not repeat this boilerplate.

---

### Component 4: Supabase Mock Layer (Unit Tests Only)

**Responsibility:** Provide in-memory Supabase client stub for unit tests that need to verify DB calls without real PostgreSQL.

**Location:** `packages/core/src/__tests__/mocks/supabase/`

**Communicates with:** Unit test files for DB modules (`tasks.ts`, `students.ts`, etc.)

**Internal structure:**
```
mocks/supabase/
  client.mock.ts          — vi.mock('@supabase/supabase-js') builder
  query-builder.ts        — Chainable stub for .from().select().eq()... pattern
```

**Implementation approach (MEDIUM confidence):**
The Supabase JS client uses a fluent builder: `.from('table').select('*').eq('id', x).single()`. This chain must be stubbed entirely. The cleanest approach is a recursive proxy that records the call chain and resolves to a configurable value at `.single()` / `.execute()`.

```typescript
// simplified stub concept
function createQueryStub(returnValue: unknown) {
  const stub: Record<string, unknown> = {}
  const chain = new Proxy(stub, {
    get: (_target, prop: string) => {
      if (prop === 'data' || prop === 'error') return returnValue
      return () => chain  // return self for chaining
    }
  })
  return chain
}
```

**Note:** Only use the mock Supabase client in unit tests. Integration tests use the real local Supabase instance — this is the project's stated decision and it is correct. Mocking Supabase for integration tests defeats the purpose of testing DB queries.

---

### Component 5: Fixture Factories

**Responsibility:** Generate valid, typed test data for all domain objects used across tests. Single source of truth for "what does a valid Student look like in tests."

**Location:** `packages/core/src/__tests__/fixtures/` (shared) and `packages/bot-discord/src/__tests__/fixtures/` (Discord-specific)

**Communicates with:** All test files (consumes fixtures), mock layers (passes fixture data into mocks)

**Internal structure:**
```
fixtures/
  core/
    student.factory.ts    — createStudent(overrides?)
    exercise.factory.ts   — createExercise(overrides?)
    session.factory.ts    — createSession(overrides?)
    submission.factory.ts — createSubmission(overrides?)
    faq.factory.ts        — createFaqEntry(overrides?)
  discord/
    message.factory.ts    — createDiscordMessage(overrides?) → uses Discord mock layer
    interaction.factory.ts
    member.factory.ts
```

**Pattern (HIGH confidence — standard TypeScript fixture pattern):**
Use a plain factory function that merges defaults with overrides. No library needed.

```typescript
// packages/core/src/__tests__/fixtures/core/student.factory.ts
import type { Student } from '@assistme/core'

let seq = 0

export function createStudent(overrides: Partial<Student> = {}): Student {
  seq++
  return {
    id: `student-${seq}`,
    discord_id: `discord-${seq}`,
    name: `Test Student ${seq}`,
    session_id: 'session-1',
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}
```

**Why factory functions over static objects:** Tests that share a static object can accidentally mutate it across test cases. Factory functions ensure isolation by construction.

---

### Component 6: Supabase Docker Service (Integration Tests)

**Responsibility:** Run a real PostgreSQL + Supabase stack locally for integration tests. Apply all production migrations. Provide isolated test schema.

**Location:** Managed by `supabase/` CLI config, seeded via `supabase/seed.sql` + test-specific seed

**Communicates with:** Integration test files (via real `@supabase/supabase-js` client pointing to `localhost:54321`), Vitest `globalSetup` (lifecycle management)

**Lifecycle:**
```
vitest globalSetup:
  setup()   → spawn: supabase start (idempotent)
             → run: supabase db reset (apply migrations + seed)
  teardown() → (optionally) supabase stop
```

**Test isolation strategy (MEDIUM confidence — based on Supabase community discussion):**
The cleanest approach for this codebase is data prefixing + afterEach cleanup, not transaction rollback. Reason: the Supabase JS client does not expose raw transaction handles, and rolling back transactions across HTTP REST calls is not straightforward.

Recommended pattern:
1. In integration test `beforeAll`, seed test data with a unique `test_run_id` prefix
2. In `afterAll`, delete all rows where `metadata->>'test_run_id' = testRunId`
3. Use a service-role client (with `persistSession: false`) for fixture insertion and cleanup to bypass RLS

**Critical pitfall (HIGH confidence from verified community source):** Initialize the service-role client for test fixtures with `persistSession: false`. Without this, when a regular test client authenticates as a test user, the service-role client silently adopts that session and loses admin privileges, causing fixture cleanup to fail with RLS violations.

---

### Component 7: Discord Dev Environment (E2E Tests)

**Responsibility:** Provide a real Discord bot token + test server (guild) + channel IDs for running end-to-end scenarios against the actual Discord gateway.

**Location:** Environment variables in `.env.test` (not committed), referenced in `vitest.config.ts` E2E project config

**Communicates with:** E2E test files (real `discord.js` Client), test Discord server (real guild with test channels)

**Setup requirements:**
1. Create a second Discord application in the Developer Portal with bot enabled
2. Create a dedicated test Discord server (guild)
3. Invite the dev bot with required permissions (Send Messages, Manage Messages, Read Message History, Use Slash Commands)
4. Store `DISCORD_BOT_TOKEN_DEV`, `DISCORD_TEST_GUILD_ID`, `DISCORD_TEST_CHANNEL_ID`, `DISCORD_TEST_ADMIN_CHANNEL_ID` in `.env.test`

**E2E test structure:**
- Bot connects in `beforeAll`, disconnects in `afterAll`
- Send a real message to the test channel, wait for bot response (with timeout assertion)
- Verify response content matches expected pattern
- Cleanup: delete test messages after assertion

**Note:** E2E tests requiring real Discord connection CANNOT run in CI without storing `DISCORD_BOT_TOKEN_DEV` as a GitHub Actions secret. Unit and integration tests must be runnable without any Discord credentials.

---

### Component 8: GitHub Actions CI Pipeline

**Responsibility:** Run unit and integration tests automatically on push/PR. Report failures before merge.

**Location:** `.github/workflows/test.yml`

**Communicates with:** Vitest runner (via `pnpm test:unit` and `pnpm test:integration`), GitHub (reports, PR checks)

**Structure:**
```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    # No services needed — all external deps mocked
    steps: checkout, pnpm install, typecheck, pnpm test:unit

  integration-tests:
    runs-on: ubuntu-latest
    # Needs Docker for Supabase local
    services:
      docker: { image: docker:dind }
    steps: checkout, install supabase CLI, pnpm install, supabase start, pnpm test:integration
```

E2E tests: triggered manually or on specific branch patterns only. Requires `DISCORD_BOT_TOKEN_DEV` secret and is explicitly excluded from default CI to avoid blocking PRs on external Discord API availability.

---

## Data Flow

### Unit Test Flow

```
Test file
  → vi.mock('@anthropic-ai/sdk')         — Claude API intercepted
  → vi.mock('@supabase/supabase-js')     — DB calls intercepted
  → import handler under test (e.g. dm-handler.ts)
  → createDiscordMessage(fixture)        — build mock Discord event
  → call handler(mockMessage)            — execute handler code path
  → assert mockCreate.toHaveBeenCalledWith(expectedPrompt)
  → assert mockSupabase.insert.toHaveBeenCalledWith(expectedRecord)
  → assert mockMessage.channel.send.toHaveBeenCalledWith(expectedReply)
```

No network calls. No filesystem. Runs in milliseconds per test.

### Integration Test Flow

```
globalSetup:
  supabase start (Docker)
  supabase db reset (apply all migrations)
  seed test base data

Integration test file:
  → import real DB module (packages/core/src/db/students.ts)
  → connect real supabase client to localhost:54321
  → vi.mock('@anthropic-ai/sdk')         — Claude API still mocked
  → call DB function: createStudent(fixture)
  → assert: getStudent(id) returns expected record
  → call agent with real DB + mock Claude
  → assert: DB state mutated correctly
  → afterAll: cleanup prefixed test data

globalTeardown:
  supabase stop (optional — keep running for dev speed)
```

Database state is real. Only AI calls are mocked. Exercises real SQL, migrations, RPC functions.

### E2E Test Flow

```
beforeAll:
  connect Discord dev bot (real token)
  wait for 'ready' event

E2E test:
  → send message to #test-dm as test student user (via bot API)
  → wait for bot reply (poll with timeout, max 10s)
  → assert reply content matches scenario expectation
  → record message IDs for cleanup

afterAll:
  → delete test messages
  → destroy Discord client
```

Only for critical flows: DM submission, button interactions, slash command responses.

---

## Suggested Build Order

Dependencies between components dictate this order. Each layer depends on the previous being functional.

```
Phase 1 (Foundation — no dependencies)
  1a. Vitest root config + ESM resolution
  1b. Package-level tsconfig for tests
  Verify: `pnpm test:unit` runs empty suite without errors

Phase 2 (Shared mocks — depends on Phase 1)
  2a. Claude API mock layer (packages/core/src/__tests__/mocks/anthropic/)
  2b. Supabase mock layer (packages/core/src/__tests__/mocks/supabase/)
  2c. Core fixture factories (packages/core/src/__tests__/fixtures/)
  Verify: factories produce type-valid objects

Phase 3 (Discord mock layer — depends on Phase 2)
  3a. Discord.js mock objects (Client, Message, Interaction, Guild, Member)
  3b. Discord fixture factories
  Verify: can construct mock Discord.Message without errors

Phase 4 (First unit tests — depends on Phases 2 + 3)
  4a. Unit tests for pure logic (agent tool parsers, context builders, utils)
  4b. Unit tests for handlers (dm-handler, admin-handler, faq)
  4c. Unit tests for cron jobs (digest formatters, deadline calculators)
  Verify: `pnpm test:unit` runs and passes

Phase 5 (Supabase Docker — depends on Phase 4)
  5a. Supabase local config (supabase/config.toml test settings)
  5b. Vitest globalSetup with supabase start/reset
  5c. Integration tests for DB modules (students, exercises, submissions)
  5d. Integration tests for agents (real DB + mock Claude)
  Verify: `pnpm test:integration` starts Docker, runs, all pass

Phase 6 (Discord E2E — depends on Phase 5, optional for CI)
  6a. Discord dev bot and test server setup
  6b. E2E test helpers (sendAndWait, cleanup)
  6c. E2E scenarios for critical flows
  Verify: `pnpm test:e2e` connects to real Discord and exercises bot
```

**Why this order:**
- You cannot build Discord mocks without the Vitest config in place (Phase 1 first)
- Fixture factories must exist before any test can be written (Phase 2+3 before 4)
- Unit tests must be stable before adding the complexity of Docker services (Phase 4 before 5)
- E2E is last because it has the most external dependencies and is the least valuable for day-to-day development feedback

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mocking Supabase in Integration Tests

**What:** Using `vi.mock('@supabase/supabase-js')` in files named `*.integration.test.ts`
**Why bad:** Integration tests exist specifically to validate that DB queries, migrations, and RPC functions work. Mocking the DB in an "integration" test makes it a unit test with extra steps.
**Instead:** Use the local Supabase Docker instance for all integration tests. Use the mock only in `*.test.ts` unit tests.

### Anti-Pattern 2: Sharing Mock State Between Tests

**What:** Declaring `const mockCreate = vi.fn()` outside of `beforeEach` and not calling `mockCreate.mockReset()` between tests
**Why bad:** The 5th test in a file inherits mock call history from the previous 4 tests. `toHaveBeenCalledWith()` assertions become unreliable.
**Instead:** Always call `vi.clearAllMocks()` in `beforeEach` at the test suite level, or use `clearMocks: true` in Vitest config.

### Anti-Pattern 3: Testing Discord.js Internals

**What:** Writing tests that verify the bot registers event listeners on the Client, or that internal Collection caches are populated correctly
**Why bad:** These are Discord.js implementation details. They change with library updates and add zero value — you're testing the library, not your code.
**Instead:** Test behavior: given a message event fires, does the handler return the expected response? Mock at the handler input/output boundary.

### Anti-Pattern 4: Full Bot Start in Unit Tests

**What:** Calling `main()` from `packages/bot-discord/src/index.ts` in a test, then testing behavior
**Why bad:** `main()` connects to the Discord gateway, registers slash commands via REST API, starts cron jobs. This makes tests slow, flaky (network-dependent), and breaks test isolation.
**Instead:** Test handlers and agents in isolation by importing them directly. The entry point `index.ts` should have near-zero test coverage — it is composition code.

### Anti-Pattern 5: One Big Mock Object

**What:** A single `discordMocks.ts` file that exports all mock objects as a shared singleton
**Why bad:** Tests that share mock objects can mutate each other's state (e.g., one test sets `mockMessage.content = 'test'`, the next test inherits that mutation).
**Instead:** Factory functions that produce fresh objects per test call. Each test call to `createDiscordMessage()` returns a new independent object.

---

## Directory Layout for Test Infrastructure

The proposed layout preserves the existing `src/` structure and adds `__tests__/` alongside source code in each package:

```
packages/
  core/
    src/
      __tests__/
        mocks/
          anthropic/
            client.mock.ts
            responses/
              tool-use.ts
              text.ts
          supabase/
            client.mock.ts
            query-builder.ts
        fixtures/
          core/
            student.factory.ts
            exercise.factory.ts
            session.factory.ts
            submission.factory.ts
        integration/
          db/
            students.integration.test.ts
            exercises.integration.test.ts
            knowledge.integration.test.ts
          agents/
            dm-agent.integration.test.ts
            tsarag-agent.integration.test.ts
        setup/
          globalSetup.ts         — supabase start/reset/stop
          testEnv.ts             — shared env + client initialization

  bot-discord/
    src/
      __tests__/
        mocks/
          discord/
            client.mock.ts
            guild.mock.ts
            message.mock.ts
            interaction.mock.ts
            channel.mock.ts
            member.mock.ts
        fixtures/
          discord/
            message.factory.ts
            interaction.factory.ts
            member.factory.ts
        unit/
          handlers/
            dm-handler.test.ts
            admin-handler.test.ts
            faq.test.ts
            review-buttons.test.ts
          commands/
            session.test.ts
          cron/
            deadline-reminders.test.ts
            exercise-digest.test.ts
            dropout-detector.test.ts
        e2e/
          dm-flow.e2e.test.ts
          slash-commands.e2e.test.ts

vitest.config.ts              — root, projects: ['packages/*']
vitest.workspace.ts           — (unused, deprecated in Vitest 3.2)
```

**Why co-located `__tests__/`:** Tests live near the code they test. Navigating between source and test is faster. This is the pattern Vitest documentation recommends. A top-level `tests/` folder would require duplicating the package directory structure.

---

## Sources

- [Mocking Discord.js for Unit Testing — discord.js Discussion #6179](https://github.com/discordjs/discord.js/discussions/6179) — MEDIUM confidence, community discussion on official repo
- [Vitest Test Projects Guide](https://vitest.dev/guide/projects) — HIGH confidence, official documentation
- [Vitest Global Setup Config](https://vitest.dev/config/globalsetup) — HIGH confidence, official documentation
- [Supabase Local Development & CLI](https://supabase.com/docs/guides/local-development) — HIGH confidence, official documentation
- [Local Integration Testing — Supabase Discussion #16415](https://github.com/orgs/supabase/discussions/16415) — MEDIUM confidence, community patterns (no official solution)
- [Testing Supabase RLS with Vitest — index.garden](https://index.garden/supabase-vitest/) — MEDIUM confidence, practitioner blog with specific pitfalls verified
- [Vitest 3 Monorepo Setup — thecandidstartup.org](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html) — MEDIUM confidence, community article post-Vitest 3 release
- [AI SDK Core Testing — ai-sdk.dev](https://ai-sdk.dev/docs/ai-sdk-core/testing) — MEDIUM confidence (Vercel AI SDK mock patterns, not Anthropic SDK directly, but pattern applies)
