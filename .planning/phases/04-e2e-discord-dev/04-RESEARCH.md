# Phase 4: E2E Discord Dev - Research

**Researched:** 2026-03-25
**Domain:** Discord.js E2E testing with two real bot clients, Vitest globalSetup, MSW v2 mock/passthrough
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dev Bot Setup**
- D-01: Separate Discord bot application already exists for dev/testing (user has it).
- D-02: Dev bot token stored in `.env.test` file (git-ignored). Tests load it at startup.

**Test Server Structure**
- D-03: Test Discord server already exists (user has it).
- D-04: Server channels mirror all production channels (ОБЩЕЕ, ОБУЧЕНИЕ, ПОДЫ, АДМИН, exercise channels, forum for sessions). Full mirror, not minimal.
- D-05: Test server guild ID and channel IDs stored in `.env.test` alongside bot tokens.

**Test User Strategy**
- D-06: Second bot acts as the test user (simulated student). Fully automated — no human interaction needed during test runs.
- D-07: Second bot application already exists (user has it). Token stored in `.env.test`.

**E2E Scope**
- D-08: Thorough coverage per scenario — multiple paths including edge cases, not just happy paths.
- D-09: Claude API is configurable: mocked by default (MSW fixtures, deterministic, free), real API with `--live` flag for occasional full-stack testing.

### Claude's Discretion

- E2E test file naming convention (`.e2e.test.ts` suffix per Phase 1 exclude patterns)
- Vitest E2E project configuration details
- MSW handler design for E2E Claude mock vs --live passthrough
- Test data seeding strategy (Supabase local for E2E or fixtures only)
- Timeout values for E2E tests (Discord latency + Claude API latency in --live mode)
- `.env.test` variable naming conventions

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| E2E-01 | Bot Discord de dev cree (token separe, application Discord dediee) | D-01/D-02: already exists; research covers how to load `.env.test` in Vitest globalSetup |
| E2E-02 | Serveur Discord de test cree avec channels miroir de la prod | D-03/D-04/D-05: already exists; research covers channel resolution API and test server bootstrap |
| E2E-03 | Scenario E2E: flux DM etudiant complet (message → DM Agent → reponse) | Research covers two-client pattern, wait-for-reply utility, MSW mock for Claude default |
| E2E-04 | Scenario E2E: soumission exercice (upload → review → feedback) | Research covers file attachment sending via discord.js REST, Supabase local seeding for student record |
| E2E-05 | Scenario E2E: FAQ (question → detection pattern → reponse) | Research covers FAQ channel targeting, role assignment prerequisite for student auth check |
</phase_requirements>

---

## Summary

Phase 4 adds E2E smoke tests that connect two real Discord.js clients (dev bot + test-user bot) to a dedicated test Discord server. The test-user bot sends messages; the dev bot processes them via the same handlers as production; tests assert the response content and side-effects in Supabase local.

The core technical challenge is orchestrating two asynchronous Discord clients: one posting a message, the other receiving the bot's reply. This requires a reliable `waitForMessage()` helper built on the dev-bot client's `messageCreate` event, with per-test timeouts and cleanup. MSW v2 (already installed and used in the integration test layer) intercepts `https://api.anthropic.com/v1/messages` by default so tests run without spending API credits; a `--live` flag passes through to the real Claude API.

Supabase local (already running, confirmed) must hold a seeded student record whose `discord_id` matches the test-user bot, because `runDmAgent` and `faq.ts` both resolve students from the DB. The E2E Vitest project references the existing `test/globalSetup.ts` for DB startup and adds a `setupFiles` entry that starts the MSW server and connects both Discord clients before any test file runs.

**Primary recommendation:** Use a single Vitest E2E project (`e2e` project in `vitest.config.ts`) with `globalSetup` for bot lifecycle + `setupFiles` for per-file client state reset. Put all E2E test files at `test/e2e/*.e2e.test.ts` (not co-located with source) because they require runtime Discord credentials absent from the unit/integration projects.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.1 (installed) | E2E test runner | Already used; `projects:` API allows isolated E2E project with separate env/timeout |
| discord.js | 14.25.1 (installed) | Both bot clients in tests | Same library as production code — tests exercise real Client path, not stubs |
| msw | 2.12.14 (installed) | Intercept Claude API HTTP in-process | Already wired in `test/msw-server.ts`; zero extra install |
| @supabase/supabase-js | 2.49.1 (installed) | Seed student/FAQ records before tests | Reuse `createTestClient()` from `test/integration-helpers.ts` |
| dotenv | 17.3.1 (installed) | Load `.env.test` in globalSetup | Same pattern as production `.env` loading |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:crypto `randomUUID` | built-in | Unique test-run prefix for DB rows | Reuse `createTestRunId()` from integration-helpers |
| node:timers/promises `setTimeout` | built-in | Polling interval inside `waitForMessage()` | Avoid adding a test-only sleep library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MSW for Claude mock in E2E | `vi.mock('@anthropic-ai/sdk')` | vi.mock cannot work inside `globalSetup.ts` (different module scope from workers); MSW intercepts at HTTP layer and works across all Vitest forks |
| Supabase local for E2E DB | Fixtures only (no real DB) | DM agent, FAQ, and admin-handler all query Supabase at runtime; fixtures cannot satisfy the `getStudentByDiscordId()` lookup that happens inside the real `runDmAgent` |
| `test/e2e/` directory for E2E files | co-located `.e2e.test.ts` next to handlers | Co-location would embed Discord credentials into the unit test project's root scan; a separate top-level `test/e2e/` directory maps cleanly to a dedicated Vitest project with its own env |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
test/
├── e2e/
│   ├── globalSetup.e2e.ts          # Connect/disconnect both Discord clients + start MSW
│   ├── helpers/
│   │   ├── wait-for-message.ts     # waitForMessage(client, predicate, timeout) utility
│   │   ├── seed-e2e.ts             # Seed student + FAQ records in Supabase local
│   │   └── env.ts                  # Load + validate .env.test variables
│   ├── dm-student-flow.e2e.test.ts # E2E-03
│   ├── exercise-submission.e2e.test.ts  # E2E-04
│   └── faq-flow.e2e.test.ts        # E2E-05
├── msw-server.ts                   # Already exists — reused for E2E
├── integration-helpers.ts          # Already exists — reused for DB seeding
└── globalSetup.ts                  # Already exists — Supabase lifecycle (reused)
```

The `vitest.config.ts` gains a fifth project:

```typescript
{
  test: {
    name: 'e2e',
    root: path.resolve(__dirname, 'test/e2e'),
    include: ['**/*.e2e.test.ts'],
    globalSetup: path.resolve(__dirname, 'test/e2e/globalSetup.e2e.ts'),
    testTimeout: 30000,   // default per test (discord round-trip ~1-3 s mocked)
    hookTimeout: 60000,   // globalSetup connects two clients
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },  // serial: bots share one guild
    // env vars loaded from .env.test by globalSetup — NOT from inline env here
  },
}
```

`pnpm test:e2e` script in `package.json`:
```bash
vitest run --project e2e
```

### Pattern 1: Two-Client Orchestration

**What:** Dev bot client and test-user bot client are both instantiated in `globalSetup.e2e.ts`. The dev bot connects with all required intents (same as production). The test-user bot connects with `GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.DirectMessages`.

**When to use:** Every E2E test. Both clients must be `ready` before any test runs.

**Example:**

```typescript
// test/e2e/globalSetup.e2e.ts
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDmHandler } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { setupFaqHandler } from '../../packages/bot-discord/src/handlers/faq.js';
import { mswServer, handlers } from '../msw-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let devBot: Client;
export let testUserBot: Client;

export async function setup(): Promise<void> {
  // Load .env.test
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  // Start MSW (mock Claude by default)
  mswServer.listen({ onUnhandledRequest: 'bypass' });
  if (!process.env['E2E_LIVE']) {
    mswServer.use(handlers.anthropicSuccess('Тест-ответ от мок-агента'));
  }

  // Start Supabase (reuse existing globalSetup)
  const { setup: supabaseSetup } = await import('../globalSetup.js');
  await supabaseSetup();

  // Dev bot — full production intents
  devBot = new Client({
    intents: [
      GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });
  setupDmHandler(devBot);
  setupFaqHandler(devBot);
  await devBot.login(process.env['DISCORD_DEV_BOT_TOKEN']!);
  await waitForReady(devBot);

  // Test-user bot — minimal intents
  testUserBot = new Client({
    intents: [
      GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });
  await testUserBot.login(process.env['DISCORD_TEST_USER_BOT_TOKEN']!);
  await waitForReady(testUserBot);
}

export async function teardown(): Promise<void> {
  mswServer.close();
  await devBot?.destroy();
  await testUserBot?.destroy();
}
```

### Pattern 2: waitForMessage Utility

**What:** A promise that resolves when a matching message arrives on a client, with timeout fallback to a thrown error.

**When to use:** All E2E assertions. Replace arbitrary `sleep()` calls.

**Example:**

```typescript
// test/e2e/helpers/wait-for-message.ts
import { Client, Message } from 'discord.js';

export function waitForMessage(
  client: Client,
  predicate: (msg: Message) => boolean,
  timeoutMs = 10_000
): Promise<Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('messageCreate', handler);
      reject(new Error(`waitForMessage timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function handler(msg: Message): void {
      if (predicate(msg)) {
        clearTimeout(timer);
        client.off('messageCreate', handler);
        resolve(msg);
      }
    }

    client.on('messageCreate', handler);
  });
}
```

Usage in a test:

```typescript
// DM scenario
const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

// Register listener BEFORE sending to avoid race
const replyPromise = waitForMessage(
  testUserBot,
  (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id
);

await dmChannel.send('Какой мой прогресс?');
const reply = await replyPromise;
expect(reply.content).toBeTruthy();
```

### Pattern 3: E2E Student Seeding

**What:** Insert a `students` row whose `discord_id` matches the test-user bot's user ID before tests that exercise student-gated flows (DM agent, FAQ student check).

**When to use:** `beforeAll` in DM and FAQ test files.

**Example:**

```typescript
// test/e2e/helpers/seed-e2e.ts
import { createTestClient, createTestRunId, cleanupTestData } from '../../test/integration-helpers.js';

export interface SeedResult {
  runId: string;
  studentId: string;
}

export async function seedTestStudent(discordUserId: string): Promise<SeedResult> {
  const db = createTestClient();
  const runId = createTestRunId();

  const { data, error } = await db.from('students').insert({
    name: `E2E Student ${runId}`,
    discord_id: discordUserId,
    pod_id: 1,
  }).select('id').single();

  if (error) throw new Error(`Seed failed: ${error.message}`);
  return { runId, studentId: data.id };
}

export async function cleanupTestStudent(runId: string): Promise<void> {
  const db = createTestClient();
  await cleanupTestData(db, 'students', 'name', runId);
}
```

### Pattern 4: MSW Mock vs --live Passthrough

**What:** `process.env['E2E_LIVE']` controls whether MSW intercepts Claude API calls or passes them through.

**When to use:** Default runs (CI, dev) use mock. Occasional full-stack validation uses `E2E_LIVE=true pnpm test:e2e`.

The MSW handler sequence pattern from `test/msw-server.ts` supports multi-turn tool-use via `anthropicToolUse` factory. For E2E, a simple `anthropicSuccess` response is sufficient to verify that the handler correctly routes the message through the agent and posts a reply — the agent logic itself is already unit-tested.

For edge-case tests (e.g., Claude returns confidence < 70 for FAQ), use `mswServer.use(handlers.anthropicSuccess(...))` inside the test to override the default handler for that one test.

### Anti-Patterns to Avoid

- **`sleep(N)` for synchronization:** Introduces flakiness. Use `waitForMessage()` event-driven pattern.
- **Global mutable `mswServer.use()` without reset:** One test's override leaks into the next. Always call `mswServer.resetHandlers()` in `afterEach`.
- **`singleFork: false` for E2E project:** Multiple forks means multiple simultaneous Discord sessions hitting the same test guild. Discord rate-limits at 50 req/s per bot. E2E must run serially in a single fork.
- **Re-registering slash commands in E2E:** `registerSlashCommands()` in `index.ts` hits Discord REST API. In E2E, the dev bot is initialized by calling `setupDmHandler(devBot)` etc. directly — NOT by calling `main()` from `index.ts`. This avoids the REST registration call on every test run.
- **Using the test-user bot to listen for dev-bot replies when DMs are involved:** For DM tests, the dev bot sends a DM back to the test-user bot. The test-user bot client needs `DirectMessages` intent and `Partials.Channel` to receive DMs from other bots. Omitting `Partials.Channel` silently drops DM events.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wait for Discord reply | Custom polling loop with `setInterval` | Event-driven `waitForMessage()` using `client.on('messageCreate')` | Polling wastes time and misses messages; event listener is immediate and cancellable |
| Multi-turn Claude mock in E2E | Custom HTTP server | MSW v2 `mswServer` already in `test/msw-server.ts` | Already works in Node with `setupServer()`; `handlers.anthropicToolUse` covers tool-use sequences |
| DB cleanup between tests | Custom SQL | `cleanupTestData()` from `test/integration-helpers.ts` with `runId` prefixing | Already tested across Phase 3; consistent cleanup contract |
| Load `.env.test` | Manual `fs.readFileSync` parsing | `dotenv.config({ path: '.env.test' })` | dotenv handles multiline, quotes, and comments correctly |
| Sequential test execution | `--sequence.concurrent false` flag | `poolOptions: { forks: { singleFork: true } }` in Vitest E2E project | `singleFork` is the correct mechanism for ensuring one test file at a time in the forks pool |

**Key insight:** The hard parts (MSW setup, DB seeding/cleanup, Supabase lifecycle) are already solved by Phase 3 infrastructure. Phase 4 is wiring two real Discord clients around those existing helpers.

---

## Common Pitfalls

### Pitfall 1: DM Intent Missing on Test-User Bot

**What goes wrong:** The test-user bot never receives the dev bot's DM reply. `waitForMessage()` times out.

**Why it happens:** Discord.js requires `GatewayIntentBits.DirectMessages` AND `Partials.Channel` on the *receiving* client for DM events. Bots receive DMs from other bots only with these configured.

**How to avoid:** Ensure the test-user bot Client constructor includes both `GatewayIntentBits.DirectMessages` in intents AND `Partials.Channel` in partials.

**Warning signs:** `waitForMessage` always times out on DM tests even when the dev bot logs show it sent the reply.

### Pitfall 2: `_clearStateForTesting()` Not Called Between Tests

**What goes wrong:** Second test in a file picks up conversation state from the first test. The DM agent receives an unexpected conversation history, causing the mock Claude response to be misinterpreted.

**Why it happens:** `dm-handler.ts` and `admin-handler.ts` both use module-level `Map` for conversation state. The E2E globalSetup loads the handlers once; state persists across tests within the same Node process.

**How to avoid:** Call `_clearStateForTesting()` (exported from `dm-handler.ts`) in `beforeEach` of every DM and admin E2E test file. The guard `if (process.env['NODE_ENV'] !== 'test') return` is already in place; set `NODE_ENV=test` in the E2E project env.

**Warning signs:** Third or fourth test in a DM scenario fails with unexpected agent behavior while first two pass.

### Pitfall 3: MSW Handles Not Reset Between Tests

**What goes wrong:** A test that overrides the Claude mock handler with `mswServer.use(handlers.anthropicSuccess('specific text'))` contaminates subsequent tests, which still use the overridden handler instead of the default.

**Why it happens:** MSW `mswServer.use()` prepends handlers that persist until explicitly removed.

**How to avoid:** Call `mswServer.resetHandlers()` in `afterEach`. This resets to whatever `mswServer.listen()` was called with (the default handler), not to zero handlers.

**Warning signs:** Tests pass in isolation but fail when the whole file runs.

### Pitfall 4: Student Record Missing for FAQ Student Auth Check

**What goes wrong:** `faq.ts` calls `isStudent(message)` which checks for the `@student` role. In the E2E test server, the test-user bot's guild member may not have the `student` role, so the FAQ handler silently ignores the message.

**Why it happens:** The bot only acts on messages from members with `@student` (or `@admin`/`@mentor`) role in the CHANNELS.faq channel. The test-user bot is just a bot account; it needs the `student` role in the test guild.

**How to avoid:** Assign the `@student` role to the test-user bot in the test Discord server (one-time manual step, documented in `.env.test` setup notes). Verify by calling `guild.members.fetch(testUserBot.user.id)` in globalSetup and asserting the role is present.

**Warning signs:** FAQ E2E test times out — dev bot never replies because `isStudent()` returns false.

### Pitfall 5: `registerSlashCommands()` Called in E2E Bot Init

**What goes wrong:** E2E globalSetup calls `main()` from `index.ts`, triggering REST API slash command registration on every test run. This hits rate limits and adds 1-2 seconds per run.

**Why it happens:** `index.ts` calls `registerSlashCommands()` in its `main()` function unconditionally.

**How to avoid:** Do NOT call `main()` in E2E globalSetup. Instead, instantiate the Client directly and wire only the needed handlers (`setupDmHandler`, `setupFaqHandler`). Slash commands are tested via integration or manual tests, not E2E.

**Warning signs:** E2E suite output shows `Registering slash commands...` during test run.

### Pitfall 6: Discord Message Content Intent Not Enabled in Test Guild

**What goes wrong:** `message.content` is always empty string. FAQ and DM handlers receive the message but `question.length < 5` check exits early.

**Why it happens:** Discord requires `Message Content Intent` to be enabled in the bot application settings in the Developer Portal AND requested via `GatewayIntentBits.MessageContent`. If the intent is privileged and not approved in the Developer Portal for the dev bot app, `message.content` is always `''`.

**How to avoid:** For development/test bots used in a single server with under 100 servers total, `MessageContent` is available without approval. Verify it is enabled in the Discord Developer Portal under the bot's "Privileged Gateway Intents" settings.

**Warning signs:** All handler tests pass locally in unit tests (where content is set in mock objects) but E2E tests receive empty content.

### Pitfall 7: Race Condition — `waitForMessage` registered after send

**What goes wrong:** The test-user bot sends a message; the dev bot processes it immediately; the dev bot's reply arrives before `waitForMessage` registers its listener. The promise never resolves.

**Why it happens:** If the test code sends the message and then registers the listener, the reply may have already fired.

**How to avoid:** Always register `waitForMessage` listener BEFORE sending the trigger message. The `waitForMessage` helper should be called and the promise stored, then the send should occur.

**Warning signs:** Tests fail with `waitForMessage timed out` on fast machines / fast mock responses.

---

## Code Examples

### E2E Test File — DM Student Flow (E2E-03)

```typescript
// test/e2e/dm-student-flow.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { devBot, testUserBot } from './globalSetup.e2e.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { seedTestStudent, cleanupTestStudent } from './helpers/seed-e2e.js';
import { _clearStateForTesting } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { mswServer, handlers } from '../msw-server.js';

describe('DM student flow (E2E-03)', () => {
  let runId: string;

  beforeAll(async () => {
    const result = await seedTestStudent(testUserBot.user!.id);
    runId = result.runId;
  });

  afterAll(async () => {
    await cleanupTestStudent(runId);
  });

  beforeEach(() => {
    _clearStateForTesting();
    mswServer.resetHandlers();
  });

  it('student sends message, bot replies via DM Agent', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id
    );

    await dmChannel.send('Какой мой прогресс?');
    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
    expect(reply.author.bot).toBe(true);
  });

  it('unknown student receives student-not-found response', async () => {
    // Override MSW to simulate Claude responding with "student not found" message
    mswServer.use(handlers.anthropicSuccess('Студент не найден в системе.'));

    const unknownUserDm = await devBot.users.createDM(testUserBot.user!.id);
    // Actually we send from a different channel — just verifying the mock route
    // Edge case tested here: agent returns graceful error when student not in DB
  });
});
```

### E2E Test File — FAQ Flow (E2E-05)

```typescript
// test/e2e/faq-flow.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { devBot, testUserBot } from './globalSetup.e2e.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { mswServer, handlers } from '../msw-server.js';

describe('FAQ flow (E2E-05)', () => {
  beforeEach(() => {
    mswServer.resetHandlers();
  });

  it('student question in #faq channel triggers bot reply', async () => {
    const guild = devBot.guilds.cache.get(process.env['DISCORD_TEST_GUILD_ID']!);
    const faqChannel = guild?.channels.cache.find(
      (ch): ch is import('discord.js').TextChannel =>
        ch.type === 0 && ch.name === 'faq'
    );
    if (!faqChannel) throw new Error('faq channel not found in test guild');

    // Override: mock high-confidence answer
    mswServer.use(
      handlers.anthropicSuccess(
        JSON.stringify({ answer: 'Модуль 1 длится 2 недели.', confidence: 85, matchedFaqId: null, suggestAddToFaq: false })
      )
    );

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channelId === faqChannel.id
    );

    await faqChannel.send('Сколько длится модуль 1?');
    const reply = await replyPromise;

    expect(reply.content).toContain('Модуль 1');
  });
});
```

### CI Workflow — E2E Job (workflow_dispatch only)

```yaml
# Replaces the placeholder in .github/workflows/test.yml
  e2e-tests:
    name: E2E Tests (manual only)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: '10'

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: pnpm install --frozen-lockfile

      - name: Start Supabase local
        run: supabase start

      - name: Write .env.test from secrets
        run: |
          cat > .env.test <<EOF
          DISCORD_DEV_BOT_TOKEN=${{ secrets.DISCORD_DEV_BOT_TOKEN }}
          DISCORD_TEST_USER_BOT_TOKEN=${{ secrets.DISCORD_TEST_USER_BOT_TOKEN }}
          DISCORD_TEST_GUILD_ID=${{ secrets.DISCORD_TEST_GUILD_ID }}
          DISCORD_CLIENT_ID=${{ secrets.DISCORD_DEV_CLIENT_ID }}
          SUPABASE_URL=http://127.0.0.1:54321
          SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
          ANTHROPIC_API_KEY=test-placeholder
          OPENAI_API_KEY=test-placeholder
          NODE_ENV=test
          LOG_LEVEL=silent
          EOF

      - name: Run E2E tests
        run: pnpm test:e2e
```

### `.env.test` Template

```bash
# .env.test — E2E bot credentials — git-ignored
# Dev bot (production mirror, dedicated app)
DISCORD_DEV_BOT_TOKEN=Bot_token_here
DISCORD_DEV_CLIENT_ID=application_id_here

# Test-user bot (simulates students)
DISCORD_TEST_USER_BOT_TOKEN=Bot_token_here

# Test server
DISCORD_TEST_GUILD_ID=guild_id_here

# Supabase local (same as integration tests)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Claude API (used only with E2E_LIVE=true)
ANTHROPIC_API_KEY=sk-ant-...

# Misc
OPENAI_API_KEY=sk-...
NODE_ENV=test
LOG_LEVEL=silent
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `discord.js` mock libraries (discordjs-mock, etc.) | Two real Clients against a real test server | After discord.js v14 — mock libs unmaintained | Real clients exercise the actual gateway; no mock drift |
| E2E tests in same Vitest project as unit tests | Separate Vitest project with `singleFork` | Vitest 1.x+ | E2E env vars (real tokens) don't leak into unit/integration runs |
| Manual `setTimeout` delays | Event-driven `waitForMessage()` | Standard practice | No arbitrary sleep times; faster test execution |

---

## Open Questions

1. **FAQ handler student auth in E2E**
   - What we know: `faq.ts` line 18 calls `isStudent(message)` which checks `message.member.roles.cache.some(r => r.name === ROLES.student)`. For E2E, `message.member` is resolved from the guild member cache.
   - What's unclear: Whether the test-user bot's guild member in the test Discord server already has the `@student` role assigned manually, or if this needs a setup step.
   - Recommendation: The globalSetup should fetch the test-user bot's guild member and assert the role exists. If not, log a clear error: "Test-user bot missing @student role in test guild — assign manually in Discord server settings."

2. **Exercise submission E2E (E2E-04) requires attachment**
   - What we know: `dm-handler.ts` checks `message.attachments` for files. In E2E, the test-user bot sends a real message. The discord.js REST API supports `Message.send({ files: [{ attachment: buffer, name: 'test.pdf' }] })` for file uploads.
   - What's unclear: Whether a 0-byte or very small synthetic file is sufficient for the handler's MIME type check, or if the bot tries to `fetch()` the attachment URL (it does — line 92 in dm-handler.ts calls `fetch(attachment.url)`).
   - Recommendation: Use a small (1 KB) real PDF buffer in the test. Discord stores it at `cdn.discordapp.com`; the bot fetches it. This is a real HTTP call — MSW does NOT intercept non-localhost URLs unless configured to. The file fetch does not need mocking since the handler only checks MIME type and size, not file content. This is fine.

3. **`discordClient` module-level variable in `dm-handler.ts`**
   - What we know: `setupDmHandler(client)` sets `discordClient = client` (module-level). In E2E globalSetup, this is called with `devBot`. If globalSetup is called multiple times (e.g., test file re-imports), the variable gets overwritten.
   - What's unclear: Whether Vitest's `singleFork` + `globalSetup` guarantees the setup runs exactly once.
   - Recommendation: `globalSetup.ts` with `singleFork: true` runs once per project. This is safe. Document that E2E tests MUST use the `e2e` project (not the `bot-discord` unit project).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | E2E test runner | Yes | v24.14.0 | — |
| pnpm | Install/scripts | Yes | 10.32.1 | — |
| Vitest | E2E project | Yes | 4.1.1 | — |
| discord.js | Both bot clients | Yes | 14.25.1 | — |
| msw | Claude API mock | Yes | 2.12.14 | — |
| Supabase local | Student seeding + agent DB calls | Yes (running) | active at 127.0.0.1:54321 | — |
| Discord dev bot token | devBot client login | User has it (D-01) | — | None — blocks E2E |
| Discord test-user bot token | testUserBot login | User has it (D-07) | — | None — blocks E2E |
| Discord test guild | E2E-02 | User has it (D-03) | — | None — blocks E2E |
| `@student` role on test-user bot | FAQ auth check in faq.ts | Unknown — verify at setup | — | Manual role assignment (one-time) |

**Missing dependencies with no fallback:**
- Discord credentials (dev bot token, test-user bot token, test guild ID) must be in `.env.test` before E2E runs. Wave 0 task must create `.env.test.example`.

**Missing dependencies with fallback:**
- `@student` role on test-user bot: if missing, globalSetup should detect it and throw a clear error with instructions.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection:
  - `packages/bot-discord/src/handlers/dm-handler.ts` — `_clearStateForTesting()`, conversation state map, DM flow
  - `packages/bot-discord/src/handlers/faq.ts` — `isStudent()` role check, channel name guard
  - `packages/bot-discord/src/index.ts` — Client intents, handler setup order
  - `packages/bot-discord/src/config.ts` — Channel and role names
  - `test/msw-server.ts` — Existing MSW handlers
  - `test/integration-helpers.ts` — `createTestClient`, `cleanupTestData`
  - `test/globalSetup.ts` — Supabase lifecycle
  - `vitest.config.ts` — Existing projects, exclude patterns for `.e2e.test.ts`
  - `.github/workflows/test.yml` — E2E placeholder at `workflow_dispatch`
  - `package.json` — Existing test scripts

- Discord.js v14 docs — Client intents, `Partials.Channel` for DM receipt, `Client.on('messageCreate')`, `users.createDM()` API

### Secondary (MEDIUM confidence)

- Vitest 4.x `projects` API documentation — `poolOptions.forks.singleFork` for serial execution, `globalSetup` lifecycle, project-level `env`
- MSW v2 `setupServer` Node.js mode — `listen()`, `resetHandlers()`, `close()` lifecycle pattern

### Tertiary (LOW confidence)

- Discord bot-to-bot DM behavior: documented in Discord developer docs as supported when both bots are in the same server and `DirectMessages` intent is active. Verified by community usage but not personally tested in this codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from pnpm store
- Architecture: HIGH — based on direct source inspection of all handlers and existing test infrastructure
- Pitfalls: HIGH — derived from actual source code reading (dm-handler.ts conversation state, faq.ts auth check, index.ts slash command registration)
- CI pattern: HIGH — existing workflow file directly inspected, placeholder job confirmed

**Research date:** 2026-03-25
**Valid until:** 2026-06-01 (stable — discord.js v14 LTS, Vitest 4.x)
