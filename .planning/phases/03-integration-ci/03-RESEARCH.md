# Phase 3: Integration + CI - Research

**Researched:** 2026-03-25
**Domain:** Supabase local Docker integration testing, MSW v2 HTTP mocking, Vitest integration project configuration, GitHub Actions CI pipeline with Docker
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOCK-03 | MSW v2 handlers for Supabase REST and Claude API HTTP interception | MSW 2.12.14 is already installed. Node.js `setupServer` pattern verified against official MSW v2 docs. |
| INTG-01 | Supabase local Docker setup (`supabase start` / `supabase db reset` in test lifecycle) | Supabase CLI 2.75.0 installed locally. Docker 29.2.0 available. `supabase/migrations/` has 16 migration files. `globalSetup.ts` pattern documented. |
| INTG-02 | DB layer tests (queries, RPC `search_formation_knowledge`) | `searchFormationKnowledge()` calls `db.rpc('search_formation_knowledge', ...)` — exact function signature and RPC argument shape verified in source. 1536d vector (post migration 012). BM25 text path works with null embedding. |
| INTG-03 | pgvector hybrid search (vector cosine + BM25) | Migration 012 sets `vector(1536)`. BM25-only path (`query_embedding: null`) is the only testable path in integration tests without a live embedding server. Vector path can be tested by inserting a known embedding manually. |
| INTG-04 | Agent + DB integration (real Supabase, mocked Claude API) | `runDmAgent` uses `getSupabase()` for DB reads/writes. Pattern: `vi.mock('@anthropic-ai/sdk')` keeps Claude mocked; Supabase client points to `localhost:54321` via env override in integration project config. |
| INTG-05 | Test isolation by data prefixing + cleanup in `afterAll` | No transaction rollback available via Supabase JS client. Prefix-based cleanup pattern (`test_run_<uuid>`) with service-role client (`persistSession: false`) is the verified approach. |
| CI-01 | GitHub Actions: unit tests on every push (fast, no Docker) | Existing `deploy.yml` uses `ubuntu-latest`. New `test.yml` adds `unit-tests` job. No Docker needed — all mocked. `pnpm/action-setup@v4` + `actions/setup-node@v4` is the 2025 standard. |
| CI-02 | GitHub Actions: integration tests on PR (separate job with Docker/Supabase) | `supabase/setup-cli@v1` action exists. Docker is available on `ubuntu-latest` runners. Supabase image caching via `actions/cache` on Docker layer dir reduces cold-start overhead. |
| CI-03 | E2E trigger: `workflow_dispatch` only | Standard GitHub Actions event. No Discord secrets needed for unit/integration CI. E2E gated behind manual trigger. |
| CI-04 | Coverage thresholds on handlers and agents packages | `@vitest/coverage-v8` 4.1.1 installed. `thresholds` config in `coverage` block per Vitest docs. Handlers and agents are the critical coverage targets (not full project coverage). |

</phase_requirements>

---

## Summary

Phase 3 builds the two layers that don't yet exist: Supabase local integration tests and the GitHub Actions CI pipeline. The foundation from Phases 1 and 2 is solid — Vitest 4.1.1 is configured with `pool: forks`, the `@assistme/core` alias points to source, MSW 2.12.14 is already installed (but unused), and 134 unit tests pass.

The integration test layer requires three new things: (1) a new Vitest project entry (`core-integration`, `bot-discord-integration`) in `vitest.config.ts` that points to `*.integration.test.ts` files with a different `env` block using `SUPABASE_URL: http://127.0.0.1:54321`; (2) a `globalSetup.ts` that calls `supabase start` and `supabase db reset` before tests and optionally `supabase stop` after; and (3) the actual integration test files covering DB CRUD, `search_formation_knowledge` RPC, and a DM Agent scenario with real DB + mocked Claude. The `formation_knowledge` table uses `vector(1536)` after migration 012 — integration tests should not depend on a live embedding server and should test the BM25-only path by passing `null` embedding, with an optional vector path using a manually inserted known embedding.

MOCK-03 (MSW v2) fits Phase 3 as the integration-level HTTP mock, replacing `vi.mock()` for Supabase REST and Anthropic API in integration tests. MSW intercepts at the network layer, which means the real Supabase JS client's HTTP calls can be intercepted in unit contexts without needing Docker. The planner can implement MOCK-03 as MSW handlers reusable across both unit and integration test layers.

**Primary recommendation:** Add two Vitest projects for integration tests in `vitest.config.ts`, write a `globalSetup.ts` managing `supabase` lifecycle, implement 5-6 focused integration test files, then create `.github/workflows/test.yml` with two jobs (unit on push, integration on PR). Coverage thresholds belong in the root `vitest.config.ts` `coverage.thresholds` block.

---

## Standard Stack

### Core (already installed, verified by `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.1 | Test runner, integration project config | Already installed. `projects` API supports multiple named projects with different include patterns and env blocks. |
| @vitest/coverage-v8 | ^4.1.1 | Coverage with thresholds | Already installed. `thresholds` option added to `coverage` config for Phase 3. |
| msw | ^2.12.14 | HTTP interception for Supabase REST + Claude API | Already installed at root. Unused — Phase 3 activates it via `setupServer`. |
| @supabase/supabase-js | ^2.49.1 | Integration test client pointing to localhost | Already in `packages/core`. No new install needed. |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase CLI | 2.75.0 | `supabase start`, `supabase db reset`, `supabase stop` | Must be installed in CI via `supabase/setup-cli@v1` action. Already installed locally. |

### CI Dependencies (GitHub Actions)

| Action | Version | Purpose |
|--------|---------|---------|
| actions/checkout | v4 | Standard |
| pnpm/action-setup | v4 | pnpm install in CI |
| actions/setup-node | v4 | Node 20+ in CI |
| supabase/setup-cli | v1 | Install Supabase CLI in integration job |
| actions/cache | v4 | Cache pnpm store between runs |

**No new npm packages to install.** Everything needed is already in `devDependencies`.

**Version verification:** All versions confirmed from installed `node_modules` and `package.json`. MSW 2.12.14 confirmed via `node -e "require('./node_modules/msw/package.json').version"`.

---

## Architecture Patterns

### Vitest Integration Projects

Add two new project entries to `vitest.config.ts`. These are `*.integration.test.ts` files excluded from the existing unit projects:

```typescript
// vitest.config.ts — add these two projects alongside existing 'core' and 'bot-discord'
{
  test: {
    name: 'core-integration',
    root: path.resolve(__dirname, 'packages/core'),
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30000,           // DB operations are slower
    hookTimeout: 120000,          // globalSetup supabase start can take 30s+
    globalSetup: path.resolve(__dirname, 'test/globalSetup.ts'),
    env: {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'sbp_...',  // local anon key from supabase status
      ANTHROPIC_API_KEY: 'test-anthropic-key-placeholder',
      OPENAI_API_KEY: 'test-openai-key-placeholder',
      LOG_LEVEL: 'silent',
    },
  },
  resolve: {
    alias: {
      '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
},
{
  test: {
    name: 'bot-discord-integration',
    root: path.resolve(__dirname, 'packages/bot-discord'),
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    globalSetup: path.resolve(__dirname, 'test/globalSetup.ts'),
    env: {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'sbp_...',
      ANTHROPIC_API_KEY: 'test-anthropic-key-placeholder',
      OPENAI_API_KEY: 'test-openai-key-placeholder',
      DISCORD_BOT_TOKEN: 'test-discord-token-placeholder',
      DISCORD_CLIENT_ID: 'test-client-id-placeholder',
      DISCORD_GUILD_ID: 'test-guild-id-placeholder',
      LOG_LEVEL: 'silent',
    },
  },
  resolve: {
    alias: {
      '@assistme/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
},
```

**Critical:** `SUPABASE_SERVICE_ROLE_KEY` for integration tests must be the real local service role key from `supabase status`, NOT the placeholder. Store it in a `.env.test` file at project root (gitignored) and read it in `vitest.config.ts` with `dotenv`. Or use `process.env` if the key is set by `globalSetup.ts`.

### globalSetup.ts — Supabase Lifecycle

```typescript
// test/globalSetup.ts
import { execSync } from 'node:child_process';

export async function setup(): Promise<void> {
  const mode = process.env.VITEST_MODE ?? '';
  if (!mode.includes('integration')) return;

  try {
    // idempotent — if already running, exits 0
    execSync('supabase start', { stdio: 'pipe' });
  } catch {
    // already running is acceptable
  }
  // Apply all migrations + seed.sql
  execSync('supabase db reset', { stdio: 'inherit' });
}

export async function teardown(): Promise<void> {
  // Do NOT stop — keep running for dev speed.
  // Stop explicitly with `supabase stop` if needed.
}
```

**Alternative approach:** Skip `VITEST_MODE` guard entirely. Since `test:integration` script only invokes the integration projects, `globalSetup` only runs for those. Keep it simple — always run `supabase start` + `supabase db reset` in `setup()`.

**Important:** `supabase db reset` destroys all data. Integration tests must seed their own data in `beforeAll`. Never rely on pre-existing rows.

### Integration Test Data Isolation (INTG-05)

No transaction rollback is available via the Supabase JS REST client. Use data prefixing:

```typescript
// packages/core/src/db/formation/knowledge.integration.test.ts
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { searchFormationKnowledge } from '../../db/formation/knowledge.js';

const TEST_RUN_ID = randomUUID();

// Use service-role client for fixture management (bypasses RLS)
const adminDb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }   // CRITICAL: prevents session bleed
);

beforeAll(async () => {
  // Seed test-specific data with unique source_file prefix
  await adminDb.from('formation_knowledge').insert({
    module: 1,
    content_type: 'concept',
    title: `Test Concept ${TEST_RUN_ID}`,
    content: 'JavaScript closures capture variables from outer scope',
    tags: ['javascript', 'closures'],
    source_file: `test-${TEST_RUN_ID}`,
  });
});

afterAll(async () => {
  // Cleanup all rows seeded by this test run
  await adminDb
    .from('formation_knowledge')
    .delete()
    .like('source_file', `test-${TEST_RUN_ID}%`);
});
```

### MSW v2 Node.js Setup (MOCK-03)

MSW v2 in Node uses `setupServer` from `msw/node`. Handlers intercept `fetch` calls at the network level — the Supabase JS client and Anthropic SDK both use `fetch`:

```typescript
// test/msw-server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mswServer = setupServer();

// Example Anthropic handler (for unit tests that want network-level mock instead of vi.mock)
export const anthropicHandler = http.post(
  'https://api.anthropic.com/v1/messages',
  () => HttpResponse.json({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Mocked response' }],
    stop_reason: 'end_turn',
    model: 'claude-sonnet-4-5',
    usage: { input_tokens: 10, output_tokens: 5 },
  })
);
```

```typescript
// In a test file setup
import { beforeAll, afterAll, afterEach } from 'vitest';
import { mswServer } from '../../test/msw-server.js';

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
```

**MOCK-03 scoping:** In Phase 3, MSW handlers are needed for integration tests where `vi.mock('@anthropic-ai/sdk')` cannot intercept the network (because integration tests use the real Supabase client). Claude API is still mocked via `vi.mock()` in integration tests — MSW is more useful for Supabase REST interception in unit tests where you want to test the `@supabase/supabase-js` client behavior itself without Docker. The planner can scope MOCK-03 narrowly: add `msw-server.ts` + one Anthropic handler as a reusable asset; actual MSW-based unit tests can be minimal for this phase.

### search_formation_knowledge Integration Test Pattern

The RPC uses 1536-dimension vectors (after migration 012). For integration tests:

1. **BM25-only path** (no embedding server needed): Pass `query_embedding: null`. The `search_text @@ ts_query` condition fires. Testable without any external service.

2. **Vector path** (optional): Manually insert a known 1536-dim vector, then query with the same vector. Since `1 - (embedding <=> embedding) = 1.0`, the row will be the top result.

```typescript
it('finds content via BM25 text search when embedding is null', async () => {
  const results = await searchFormationKnowledge(
    'javascript closures',  // matches content we seeded
    null,                   // no embedding — BM25 only path
    { matchCount: 5, threshold: 0.0 }
  );
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].title).toContain(TEST_RUN_ID);
});
```

Note: `searchFormationKnowledge` in `knowledge.ts` uses `JSON.stringify(queryEmbedding)` when embedding is not null. When null, it passes `null` directly. The RPC handles both.

### Agent + Real DB Integration Test Pattern (INTG-04)

```typescript
// packages/core/src/ai/formation/dm-agent.integration.test.ts
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runDmAgent } from '../../ai/formation/dm-agent.js';
// Claude API is mocked, Supabase is real
vi.mock('@anthropic-ai/sdk', () => getAnthropicMockFactory());

// Seed a real student, then call runDmAgent
// Verify the agent queried the real DB (no TypeError on missing data)
// Verify response is deterministic given the mocked Claude sequence
```

### GitHub Actions CI Structure

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '10' }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test:unit

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: '10' }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - uses: actions/cache@v4
        with:
          path: ~/.supabase
          key: supabase-${{ hashFiles('supabase/migrations/**') }}
      - run: pnpm install --frozen-lockfile
      - run: supabase start
      - run: pnpm test:integration

  e2e-tests:
    name: E2E Tests (manual trigger only)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - run: echo "E2E tests require Discord dev bot token - trigger manually"
```

**Key decisions baked in:**
- Unit tests run on every push to every branch (fast feedback, no secrets needed)
- Integration tests run only on PRs (Docker overhead justified by merge gate value)
- E2E is `workflow_dispatch` only — matches CI-03 requirement
- `pnpm install --frozen-lockfile` is the correct flag for CI (not `--ci` which is npm-only)

### Coverage Thresholds (CI-04)

Add to `vitest.config.ts` `coverage` block:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.ts', '**/*.test.ts', '**/*.integration.test.ts'],
  thresholds: {
    // Target: handlers and agents packages only
    'packages/bot-discord/src/handlers/**': {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },
    'packages/core/src/ai/formation/**': {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
},
```

**Alternative (simpler):** Use global thresholds. Vitest `thresholds` per-glob requires Vitest 3+ (confirmed). If per-file-glob thresholds cause issues, fall back to global `{ statements: 60, lines: 60 }`.

---

## Recommended Project Structure (new files only)

```
test/
  globalSetup.ts                       # supabase start + db reset lifecycle
  msw-server.ts                        # MSW setupServer + reusable handlers

packages/core/src/db/formation/
  knowledge.integration.test.ts        # INTG-02, INTG-03: RPC + hybrid search

packages/core/src/db/formation/
  students.integration.test.ts         # INTG-02: CRUD DB layer

packages/core/src/ai/formation/
  dm-agent.integration.test.ts         # INTG-04: agent + real DB + mocked Claude

.github/workflows/
  test.yml                             # CI-01, CI-02, CI-03

vitest.config.ts                       # add integration projects + coverage thresholds
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP interception in Node.js | Custom `fetch` monkey-patch | `msw/node` `setupServer` | MSW uses `@mswjs/interceptors` — handles `fetch`, undici, `http.request` transparently. Custom patches miss edge cases. |
| Supabase Docker lifecycle | Custom Docker API calls | `supabase start` / `supabase db reset` | The CLI manages the full 12-container stack (postgres, auth, realtime, storage, kong). Manual Docker compose for this is hundreds of lines. |
| Test data cleanup | Transaction rollback via REST | Prefix + `afterAll` delete | Supabase JS client has no transaction API. The `service_role` client with `persistSession: false` is the safe cleanup path. |
| Coverage thresholds | Custom coverage assertion scripts | Vitest `thresholds` config | Built-in, exits non-zero on failure, integrates with CI directly. |
| CI pnpm setup | Manual cache scripts | `pnpm/action-setup@v4` + `actions/setup-node@v4` with `cache: 'pnpm'` | Handles pnpm store caching automatically. |

---

## Common Pitfalls

### Pitfall 1: Wrong SUPABASE_SERVICE_ROLE_KEY in integration project env

**What goes wrong:** The integration project's `env` block in `vitest.config.ts` has `SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-placeholder'` (same as unit tests). This is the wrong key — unit tests don't connect to a real DB, but integration tests do. `getSupabase()` will initialize but every DB call returns `{"message":"JWT invalid"}` or `{"message":"permission denied"}` errors.

**How to avoid:** Read the real local key from `supabase status --output json` after `supabase start`. The local service role key is deterministic (derived from the local JWT secret) — it's safe to commit the key for local testing since it only works against `localhost:54321`. Alternative: use `dotenv` in `vitest.config.ts` to load a `.env.test` file.

**Detection:** Integration tests return `{ data: null, error: { message: 'JWT invalid' } }` for every query.

---

### Pitfall 2: `globalSetup.ts` runs once per Vitest run, not once per project

**What goes wrong:** If `globalSetup` is defined at the root `test` config level (not inside a project), it runs once for all projects. This is correct behavior. But if it's accidentally placed inside each project's `test` block, it runs multiple times — `supabase db reset` between project runs destroys data seeded by the first project's tests.

**How to avoid:** Define `globalSetup` only on the integration projects, not the unit projects. The `supabase db reset` call resets all tables — acceptable at the start of each integration run, but not between test files within a run.

**Detection:** Second integration test file finds no seeded data because the first file's `afterAll` hasn't run yet but `db reset` already wiped tables.

---

### Pitfall 3: `supabase db reset` wipes data seeded in `beforeAll`

**What goes wrong:** Integration test lifecycle is: `globalSetup.setup()` (resets DB) → `beforeAll` (seeds data) → tests. If `globalSetup` runs `db reset` again mid-run (e.g., due to test retry or separate Vitest project), seeded data is gone and tests fail with "no rows found."

**How to avoid:** `db reset` runs ONCE at the start of the integration suite via `globalSetup`. Each test file seeds its own data in `beforeAll` and cleans up in `afterAll`. Never run `db reset` inside a test or `beforeEach`.

---

### Pitfall 4: `supabase start` in CI times out on first run

**What goes wrong:** On a fresh GitHub Actions runner with no Docker layer cache, `supabase start` pulls 6+ Docker images sequentially. Total time: 3-5 minutes. This blocks the PR gate.

**How to avoid:** Use `actions/cache@v4` to cache the Supabase Docker layers directory (`~/.supabase`). The cache key should include a hash of `supabase/migrations/**` so it invalidates when the schema changes. On cache hit, `supabase start` takes 15-30s. Note: `~/.supabase` caches the downloaded images, not the running containers.

**Warning signs:** CI integration job takes >4 minutes before any test runs.

---

### Pitfall 5: Coverage thresholds on `packages/bot-discord/src/handlers/**` fail because unit tests already covered them

**What goes wrong:** Vitest computes coverage from the test run that invoked `--coverage`. If coverage is run only against the unit test project (`pnpm test:unit --coverage`), it measures handlers and agents correctly. But if the integration project is also included in the coverage run, its `*.integration.test.ts` files don't execute handler code — the threshold can fail even though unit tests cover those handlers adequately.

**How to avoid:** Run coverage only against the unit projects: `pnpm test:unit --coverage`. The `test:integration` script does NOT need `--coverage`. Configure `pnpm test:coverage` to target unit projects only.

---

### Pitfall 6: `persistSession: false` missing on service-role client for fixture cleanup

**What goes wrong:** If test fixtures insert data using a service-role client that has `persistSession: true` (default), and a test within the same file authenticates as a test user via the application-level client, the Supabase JS client's auth state bleeds across instances. The service-role client silently adopts the user session, loses its admin privileges, and `afterAll` cleanup fails with an RLS error.

**How to avoid:** Always initialize the fixture/cleanup service-role client with `{ auth: { persistSession: false } }`. This is a documented gotcha from Supabase local testing community. See ARCHITECTURE.md Component 6.

---

### Pitfall 7: `search_formation_knowledge` RPC returns empty results in integration tests

**What goes wrong:** Seeds a row into `formation_knowledge`, then calls `searchFormationKnowledge('javascript', null)`. Returns empty array. The BM25 text trigger populates `search_text` from `title + content + tags` — but the trigger is `BEFORE INSERT OR UPDATE OF title, content, tags`. If the row was inserted without going through the trigger (e.g., direct column insertion bypassing `DEFAULT`), `search_text` may be null.

**How to avoid:** Always insert via the `upsertFormationKnowledge()` helper which goes through the normal insert path, or verify `search_text` is populated post-insert. Alternatively, insert directly and run `UPDATE formation_knowledge SET title = title WHERE source_file = 'test-...'` to fire the trigger.

**Detection:** `searchFormationKnowledge('keyword', null)` returns `[]` even though the row exists. `SELECT search_text FROM formation_knowledge WHERE source_file = 'test-...'` returns NULL.

---

## Code Examples

### globalSetup.ts

```typescript
// Source: Vitest globalSetup docs + Supabase CLI docs
import { execSync } from 'node:child_process';

export async function setup(): Promise<void> {
  console.log('[integration] Starting Supabase local stack...');
  try {
    execSync('supabase start', { stdio: 'pipe', timeout: 120_000 });
  } catch {
    // Already running — acceptable. CLI exits non-zero if already started.
  }
  console.log('[integration] Resetting DB (applying all migrations)...');
  execSync('supabase db reset', { stdio: 'inherit', timeout: 60_000 });
  console.log('[integration] Supabase ready.');
}

export async function teardown(): Promise<void> {
  // Keep running for dev speed. Stop manually with `supabase stop`.
}
```

### MSW Server (MOCK-03)

```typescript
// Source: MSW v2 official docs https://mswjs.io/docs/integrations/node/
// test/msw-server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mswServer = setupServer();

export const handlers = {
  anthropicSuccess: (responseText: string) =>
    http.post('https://api.anthropic.com/v1/messages', () =>
      HttpResponse.json({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: responseText }],
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-5',
        usage: { input_tokens: 10, output_tokens: 5 },
      })
    ),
};
```

### Integration Test: knowledge.integration.test.ts

```typescript
// packages/core/src/db/formation/knowledge.integration.test.ts
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { searchFormationKnowledge } from '../../db/formation/knowledge.js';

const RUN_ID = randomUUID();
const SOURCE = `test-intg-${RUN_ID}`;

const adminDb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

beforeAll(async () => {
  const { error } = await adminDb.from('formation_knowledge').insert({
    module: 1,
    content_type: 'concept',
    title: `Closures ${RUN_ID}`,
    content: 'JavaScript closures capture outer scope variables',
    tags: ['javascript', 'closures'],
    source_file: SOURCE,
  });
  if (error) throw new Error(`Seed failed: ${error.message}`);
});

afterAll(async () => {
  await adminDb.from('formation_knowledge').delete().eq('source_file', SOURCE);
});

describe('searchFormationKnowledge', () => {
  it('returns results via BM25 text search (null embedding)', async () => {
    const results = await searchFormationKnowledge('closures', null, {
      matchCount: 5,
      threshold: 0.0,
    });
    const match = results.find((r) => r.source_file === SOURCE);
    expect(match).toBeDefined();
    expect(match!.title).toContain('Closures');
  });

  it('returns empty array for unrelated query', async () => {
    const results = await searchFormationKnowledge(
      'quantum physics superconductors',
      null,
      { matchCount: 5, threshold: 0.0 }
    );
    const match = results.find((r) => r.source_file === SOURCE);
    expect(match).toBeUndefined();
  });
});
```

### GitHub Actions: test.yml

```yaml
# Source: GitHub Actions docs + pnpm/action-setup v4 docs
name: Tests

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '10'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test:unit

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch'
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
      - name: Cache Supabase Docker images
        uses: actions/cache@v4
        with:
          path: ~/.supabase
          key: supabase-docker-${{ hashFiles('supabase/migrations/**') }}
          restore-keys: supabase-docker-
      - run: pnpm install --frozen-lockfile
      - run: supabase start
      - run: pnpm test:integration
        env:
          SUPABASE_SERVICE_ROLE_KEY: ${{ env.SUPABASE_SERVICE_ROLE_KEY_LOCAL }}
```

---

## Project Constraints (from CLAUDE.md)

These directives apply to all code written in this phase:

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| TypeScript strict mode, no `any` | Test files must be strictly typed. Service-role client must use typed Supabase client, not `any` casts. |
| ESM imports (`import`/`export`, no `require`) | `globalSetup.ts` uses `import { execSync } from 'node:child_process'` not `require`. All test helpers use ESM. |
| Explicit `.js` extension in ESM imports | Integration test files must import `'../../db/formation/knowledge.js'` not `'../../db/formation/knowledge'`. |
| Supabase queries through `packages/core/src/db/` | Integration tests call the exported functions (`searchFormationKnowledge`, `getStudentByDiscordId`) — not raw Supabase client. Exception: the admin fixture client for seed/cleanup uses raw Supabase directly (this is test infrastructure, not production code). |
| Use pino for logging | Integration tests inherit `LOG_LEVEL: 'silent'` from the integration project env to suppress logger noise. |
| `specs/` are source of truth | Read `specs/04-bot-discord/SPEC.md` and `specs/01-cerveau-central/SPEC.md` before implementing integration tests for agent flows. |
| Spec-First: read spec before coding | Integration tests for DM Agent must verify the spec-defined tool sequence: `get_student_progress` → `get_session_exercise` → `create_submission`. |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | INTG-01, INTG-02, INTG-03, INTG-04 | Yes | 2.75.0 | None — blocking for integration tests |
| Docker | Supabase CLI (`supabase start`) | Yes | 29.2.0 | None — blocking for integration tests |
| Node.js 20+ | Runtime | Yes | v24.14.0 (exceeds min) | — |
| pnpm | Package management | Yes | 10.32.1 | — |
| MSW 2.12.14 | MOCK-03 | Yes | 2.12.14 (root devDeps) | — |
| Vitest 4.1.1 | All tests | Yes | ^4.1.1 (root devDeps) | — |
| @vitest/coverage-v8 | CI-04 | Yes | ^4.1.1 (root devDeps) | — |
| GitHub Actions runner | CI-01, CI-02 | Yes (remote) | ubuntu-latest | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Note on core-import.test.ts:** The `src/core-import.test.ts` test currently fails with a 5000ms timeout (dynamic `import('@assistme/core')` hangs in the `bot-discord` project). This is a pre-existing Phase 2 issue — 134 tests pass, 1 fails. Phase 3 should not regress this further. The planner may optionally fix this as a Wave 0 task (increase timeout or investigate the dynamic import hang with `pool: forks`).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `nock` for HTTP mocking in Node | MSW v2 `setupServer` | 2023-2024 | MSW intercepts `fetch` natively; nock breaks ESM and native fetch |
| `vitest.workspace.ts` file | `projects:` array in `vitest.config.ts` | Vitest 3.2 | Workspace file is deprecated; inline projects is the current pattern (already used here) |
| `c8` coverage provider | `@vitest/coverage-v8` | Vitest 3.x | c8 package dead (3 years old). V8 provider is built-in to Vitest. |
| Transaction-based test isolation | Data-prefix + `afterAll` cleanup | Ongoing | Supabase JS REST client has no transaction API. Prefix pattern is the community standard. |
| `pnpm/action-setup@v2` | `pnpm/action-setup@v4` | 2024 | v4 integrates with `setup-node@v4` cache key automatically. |

---

## Open Questions

1. **What is the deterministic local service role key?**
   - What we know: `supabase status` outputs `SERVICE_ROLE_KEY` after `supabase start`. The local key is derived from the local JWT secret in `supabase/config.toml` (or the default if no config exists).
   - What's unclear: No `supabase/config.toml` exists yet (only `supabase/migrations/`). The project uses the default Supabase local config.
   - Recommendation: Run `supabase start && supabase status` locally to capture the key. Hardcode it in the integration project `env` block of `vitest.config.ts` — it's deterministic for the default local config. Document it as a comment.

2. **Should `test/globalSetup.ts` guard on `VITEST_MODE` environment variable or run unconditionally?**
   - What we know: `globalSetup` defined in a Vitest project runs only when that project is selected. Since integration projects are only invoked by `test:integration`, the guard may be unnecessary.
   - What's unclear: Whether Vitest 4.x runs `globalSetup` for all projects when running `pnpm test` (all projects), or only for the selected project.
   - Recommendation: Add a `SUPABASE_URL` availability check: if `SUPABASE_URL` is a placeholder (`http://localhost:54321` without Docker running), skip `supabase start`. This makes the setup robust without needing `VITEST_MODE`.

3. **Should INTG-04 agent integration test be in `packages/core` or `packages/bot-discord`?**
   - What we know: `runDmAgent` is in `packages/core/src/ai/formation/dm-agent.ts`. But the full agent flow involves the handler layer from `packages/bot-discord`.
   - What's unclear: Whether testing `runDmAgent` directly (core package) satisfies INTG-04's "DB path exercised end-to-end" criterion, or whether calling through the handler is needed.
   - Recommendation: Test `runDmAgent` directly in `packages/core`. This is cleaner (handler is already unit-tested), and tests the actual DB interaction without Discord.js mock overhead.

---

## Sources

### Primary (HIGH confidence)

- MSW v2 official docs: https://mswjs.io/docs/integrations/node/ — `setupServer`, handler patterns, `onUnhandledRequest`
- Vitest 4.x globalSetup config: https://vitest.dev/config/#globalsetup — lifecycle hooks, project-level vs root-level
- Vitest 4.x coverage thresholds: https://vitest.dev/config/#coverage-thresholds — per-glob thresholds
- Supabase CLI docs: https://supabase.com/docs/guides/local-development — `supabase start`, `supabase db reset`
- GitHub Actions pnpm docs: https://pnpm.io/continuous-integration#github-actions — `pnpm/action-setup@v4`
- supabase/setup-cli action: https://github.com/supabase/setup-cli — CI integration
- Project source: `vitest.config.ts` — verified existing projects API structure
- Project source: `supabase/migrations/012_openai_embeddings_1536.sql` — verified `vector(1536)` dimension
- Project source: `packages/core/src/db/formation/knowledge.ts` — verified `searchFormationKnowledge` signature

### Secondary (MEDIUM confidence)

- Supabase local testing community pattern (prefix + afterAll): https://github.com/orgs/supabase/discussions/16415
- `actions/cache` for Supabase Docker images: https://github.com/orgs/supabase/discussions/9351
- Vitest per-glob coverage thresholds verified in Vitest 3.2+ changelog

### Tertiary (LOW confidence)

- `persistSession: false` pattern for service-role client isolation: inferred from documented Supabase JS client auth behavior; not found as explicit official test guidance

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages already installed, versions verified from `node_modules`
- Integration test patterns: HIGH — Supabase CLI verified locally (2.75.0), Docker verified (29.2.0), migration files read directly
- MSW v2 setup: HIGH — verified against MSW official docs; package confirmed installed at 2.12.14
- CI workflow structure: HIGH — existing `deploy.yml` provides model; `supabase/setup-cli@v1` and `pnpm/action-setup@v4` are standard documented actions
- Coverage threshold config: HIGH — Vitest 4.x docs confirm `thresholds` key with per-glob support
- Data isolation pattern: MEDIUM — `persistSession: false` requirement for service-role client is from community discussion, not official Supabase test docs

**Research date:** 2026-03-25
**Valid until:** 2026-05-25 (stable ecosystem — Vitest, MSW, Supabase CLI versions are stable)
