# Domain Pitfalls

**Domain:** Discord.js bot testing infrastructure — ESM monorepo (pnpm workspaces), TypeScript strict, Vitest, Supabase local, Claude API mocking
**Researched:** 2026-03-24
**Confidence:** HIGH (codebase-verified + official issue tracker sources)

---

## Critical Pitfalls

Mistakes that cause test suite rewrites, non-deterministic failures, or complete CI blockages.

---

### Pitfall 1: Vitest Cannot Mock `@assistme/core` From Inside `bot-discord` Tests

**What goes wrong:**
`vi.mock('@assistme/core')` in `packages/bot-discord/src/__tests__/` silently does nothing, or mocks a different module instance than what the handler actually imports. The handler under test calls the real Supabase-connected DB functions instead of stubs.

**Why it happens:**
pnpm installs workspace packages via symlinks (`node_modules/@assistme/core` points to `packages/core/dist/`). Vitest resolves the module from the symlink target path — a different absolute path than what `vi.mock` registers the mock against. This is documented in vitest-dev/vitest issue #5633: "your test-app and business-logic are importing different package instances."

Additionally, `@assistme/core` uses `"type": "module"` and exports via the `exports` field in package.json. If the `dist/` directory is stale (not rebuilt), Vitest imports outdated compiled JS, meaning code changes in `packages/core/src/` are invisible to tests until you run `pnpm build`.

**Consequences:**
- Tests pass locally (built dist is fresh) but fail in CI (dist is stale or missing)
- Mocks registered with `vi.mock('@assistme/core')` may silently no-op
- Handler tests make real DB calls, require real env vars, and are not isolated unit tests

**Prevention:**
1. Add `resolve.dedupe: ['@assistme/core']` to `vitest.config.ts` in `bot-discord` to force a single module instance
2. In `vitest.config.ts`, add `resolve.alias: { '@assistme/core': path.resolve('../core/src/index.ts') }` so Vitest imports source directly (bypasses stale dist, eliminates symlink split)
3. Add a `pretest` script or Vitest `globalSetup` that runs `pnpm -F @assistme/core build` before running bot-discord tests when in CI mode

**Detection:**
- Mock is registered but `console.log` inside the real function still fires
- Tests pass with `--run` but fail after a cold `pnpm build` wipe
- Error: `Cannot read properties of undefined` on Supabase client (env vars missing in unit test env)

**Phase:** Addressed in Phase 1 (Vitest configuration). Must be solved before any handler tests are written.

---

### Pitfall 2: `getSupabase()` Singleton Throws at Test Import Time

**What goes wrong:**
`packages/core/src/db/client.ts` exports a lazy singleton `getSupabase()` that throws if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` env vars are missing. Any test file that imports a handler which transitively imports any DB function causes immediate throw during module initialization — before the test even runs.

**Why it happens:**
The bot's handler files (`dm-handler.ts`, `faq.ts`, etc.) import directly from `@assistme/core` at the top level. Even with `vi.mock('@assistme/core')`, Vitest hoists module loading — if the mock is not applied before the import resolves, the real module initializes. In ESM, module evaluation is eager at import time.

**Consequences:**
- Entire test file fails with `Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` before any `it()` block runs
- Cannot write unit tests for any handler without setting fake env vars globally

**Prevention:**
1. In `vitest.config.ts`, set `test.env: { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'test-key' }` — fake values that satisfy the guard without connecting to real Supabase
2. In handler tests, always call `vi.mock('@assistme/core')` before any imports (Vitest hoists `vi.mock` automatically, but the factory must be declared at the top of the test file)
3. Create a `packages/bot-discord/src/__tests__/setup.ts` global setup file that sets all required env vars via `process.env` before any module is loaded

**Detection:**
- Test output: `Error: Missing SUPABASE_URL` on the first test file run
- Stack trace points to `packages/core/src/db/client.ts` line 12-13

**Phase:** Addressed in Phase 1 (Vitest configuration + test setup file).

---

### Pitfall 3: discord.js v14 Private Constructors Break Manual Mock Objects

**What goes wrong:**
Attempting to create mock `Message`, `GuildMember`, `ButtonInteraction`, or `ChatInputCommandInteraction` objects with `new Message(client, data)` fails in TypeScript because these constructors are private/internal since discord.js v13.2.0. The TypeScript compiler rejects it under strict mode.

**Why it happens:**
discord.js v14 deliberately sealed its constructors. The library's internal structure assumes objects are created by the `Client` event system from raw WebSocket payloads, not by user code. Properties like `message.guild`, `interaction.member`, `channel.guild` are populated via a cache graph — instantiating one object without the rest of the graph causes cascading `undefined` or runtime API calls.

**Consequences:**
- `as unknown as Message` casts work at runtime but break TypeScript strict mode guarantees — any property access is unsafe
- Incomplete mock objects (missing `guild.members` cache entries) cause `TypeError: Cannot read properties of undefined` when the handler traverses relationships
- Third-party mock libraries (`jest-discordjs-mocks`, `@shoginn/discordjs-mock`) target older discord.js versions or Jest — not Vitest/v14.16

**Prevention:**
1. Do not attempt to instantiate discord.js classes directly. Instead, mock at the function boundary: mock the handler's exported function or its external dependencies, not the Discord objects it receives
2. For unit tests, create plain object stubs typed with `Partial<Message>` cast: only define the properties the handler actually reads. Use `vi.fn()` for methods like `.reply()`, `.react()`
3. Example pattern:
   ```typescript
   const mockMessage = {
     author: { id: 'user-123', bot: false },
     content: 'hello',
     channel: { type: ChannelType.DM },
     attachments: new Collection(),
     reply: vi.fn().mockResolvedValue(undefined),
   } as unknown as Message;
   ```
4. Validate the cast surface: after writing a mock, run `tsc --noEmit` to ensure the handler's property accesses are covered
5. Create a shared `fixtures/discord.ts` file in `__tests__/` that exports typed factory functions — one source of truth for all handler tests

**Detection:**
- TypeScript error: `Constructor of class 'Message' is private and only accessible within the class declaration`
- Runtime error: `TypeError: Cannot read properties of null (reading 'members')` when handler calls `message.guild.members`
- Tests pass for simple cases but fail when handler accesses nested guild/channel properties

**Phase:** Addressed in Phase 2 (Unit tests). Create fixture factories before writing handler-specific tests.

---

### Pitfall 4: Module-Level `discordClient` Variable Makes Handlers Untestable Without Refactor

**What goes wrong:**
`packages/bot-discord/src/handlers/dm-handler.ts` uses a module-level mutable variable `let discordClient: Client` set by `setupDmHandler(client)`. Because ESM modules are singletons across all test files in Vitest (shared module graph), the client set in one test bleeds into another. Tests that don't call `setupDmHandler` get `undefined` for `discordClient`, causing crashes mid-handler.

**Why it happens:**
This is a testability anti-pattern: implicit global state inside a module. In production, `main()` calls each setup function once. In tests, each test file re-imports the module but gets the same module instance — the variable persists between tests unless explicitly reset.

**Consequences:**
- Test order dependency: tests pass when run in sequence A→B but fail when run in isolation or B→A
- Vitest's parallel worker model (default `pool: 'threads'`) means module state can be shared unpredictably

**Prevention:**
1. For existing handlers, call `setupDmHandler(mockClient)` in `beforeEach` and ensure mock client methods are reset with `vi.clearAllMocks()`
2. If the test suite grows, refactor handlers to accept client as a parameter (dependency injection) rather than relying on module-level state — this is a long-term improvement, not a blocker
3. Use Vitest's `--pool=forks` for tests touching module-level state: fork processes guarantee fresh module instances per test file

**Detection:**
- Tests fail when run with `vitest run` but pass with `vitest run path/to/specific.test.ts`
- Error: `TypeError: Cannot read properties of undefined (reading 'channels')` when `discordClient` is undefined

**Phase:** Addressed in Phase 2 (Unit tests). Document the setup call requirement in test file headers. Long-term refactor deferred to Phase 4.

---

### Pitfall 5: Claude API Tool-Calling Responses Are Non-Deterministic and Cannot Be Replayed Without Mocking

**What goes wrong:**
The `runDmAgent` function in `dm-agent.ts` calls Claude with multi-turn tool_use cycles (`get_student_info`, `search_course_content`, `submit_exercise`). Testing the agent end-to-end without mocking means: (a) real API calls costing money, (b) responses vary by model version, (c) tests are slow (2-10s per call), (d) tool execution path is non-deterministic.

**Why it happens:**
The agent's tool loop is deeply coupled to the Anthropic SDK's `messages.create()` response shape. Mocking requires accurately reproducing `{ type: 'tool_use', id: ..., name: ..., input: ... }` content blocks — if the mock shape is wrong, the agent's tool dispatch logic silently skips tool calls or crashes.

**Consequences:**
- Agent tests become integration tests requiring real API keys — cannot run in CI without ANTHROPIC_API_KEY secret
- If mock tool_use block is malformed, the agent loop exits early and the assertion `expect(result.submissionId).toBeDefined()` fails with no useful error

**Prevention:**
1. Mock `@anthropic-ai/sdk` at the module level: `vi.mock('@anthropic-ai/sdk')` and return crafted response sequences
2. Create fixture files (`__tests__/fixtures/anthropic-responses.ts`) with hardcoded `Message` response objects for common agent scenarios (tool_use + tool_result cycles)
3. The mock must reproduce the exact SDK response shape:
   ```typescript
   {
     id: 'msg_test',
     type: 'message',
     role: 'assistant',
     content: [{ type: 'tool_use', id: 'call_1', name: 'get_student_info', input: { discord_id: 'user-123' } }],
     stop_reason: 'tool_use',
     usage: { input_tokens: 100, output_tokens: 50 }
   }
   ```
4. Test the tool dispatch logic separately from the API call — extract the tool routing function and test it with static inputs

**Detection:**
- Tests require `ANTHROPIC_API_KEY` to be set to run
- Test runtime exceeds 5 seconds per test
- `TypeError: Cannot read properties of undefined (reading 'type')` when mock response is missing required fields

**Phase:** Addressed in Phase 2 (Unit tests for agents). Build Anthropic fixture factory before writing any agent tests.

---

## Moderate Pitfalls

---

### Pitfall 6: Supabase Local Docker Pull Takes 3-5 Minutes in CI, Blocking Every PR

**What goes wrong:**
`supabase start` on a fresh GitHub Actions runner downloads 6+ Docker images sequentially (postgres, auth, storage, studio, realtime, kong). This adds 3-5 minutes to every CI run. On standard GitHub-hosted runners (ephemeral, no Docker layer cache), this cost repeats every run.

**Prevention:**
1. Cache Supabase Docker images between runs using GitHub Actions' cache. Note: official `supabase/setup-cli` action caching is limited — self-hosted runners with persistent volumes are the most effective solution
2. Split CI jobs: unit tests (no Docker) run first and fast; integration tests (with Supabase) run after, only on non-draft PRs
3. Use `supabase start --ignore-health-check` combined with explicit health polling to let other steps run in parallel while Supabase starts
4. For unit and agent tests that mock DB calls, ensure they run without `SUPABASE_URL` — they should not require Docker at all

**Detection:**
- CI job takes >5 minutes before any tests execute
- `supabase start` step in GitHub Actions logs shows sequential docker pull lines

**Phase:** Addressed in Phase 3 (CI setup). Design the CI matrix to gate Docker usage to integration test jobs only.

---

### Pitfall 7: pgvector Extension Missing or Wrong Dimension in Local Supabase

**What goes wrong:**
Migration `010_formation_knowledge.sql` and `007_memory_embeddings.sql` use the `vector` extension with 1536-dimensional columns (OpenAI `text-embedding-3-small`). When running `supabase db reset` locally, if the Docker image doesn't include pgvector or is an older version, the migration fails silently or with a cryptic error about the extension control file.

**Why it happens:**
Older `supabase/postgres` Docker image tags (pre-15.1.0.84) had inconsistent pgvector bundling. Additionally, migration `012_openai_embeddings_1536.sql` changes vector dimensions — running migrations out of order (e.g., seeding before all migrations apply) produces dimension mismatch errors at runtime.

**Consequences:**
- `supabase db reset` exits with `ERROR: extension "vector" is not available`
- All embedding-related searches return empty results without errors (wrong dimension silently truncates)
- Integration tests for `searchFormationKnowledge` pass but return wrong data

**Prevention:**
1. Pin the Supabase CLI version in CI and in local development docs — use `supabase >= 1.200.0` which bundles pgvector 0.7+
2. After `supabase db reset`, run a smoke query: `SELECT '[1,2,3]'::vector(3);` to verify the extension is active
3. In integration test `globalSetup`, verify the vector dimension of key tables before running tests
4. Never run seed scripts before all migrations complete — add a migration readiness check to `seed:knowledge`

**Detection:**
- `ERROR: extension "vector" is not available` in migration output
- `ERROR: expected 1536 dimensions, not 384` in runtime logs when querying knowledge base
- `pnpm seed:knowledge` completes but all vectors are null

**Phase:** Addressed in Phase 3 (Supabase local setup). Document exact CLI version pin in project README.

---

### Pitfall 8: Vitest `vi.mock` Hoisting Interacts Badly With ESM Dynamic Imports

**What goes wrong:**
The bot's entry point (`index.ts`) uses dynamic `dotenv.config()` at the top before other imports (a deliberate ordering to load env vars before Discord client init). In tests, if a test file imports any module from `index.ts`'s dependency graph, Vitest's mock hoisting (`vi.mock` calls are moved before all imports) can cause env vars to not be set when modules first load.

**Prevention:**
1. Never import from `index.ts` in tests — import handlers and agents directly
2. Set env vars in `vitest.config.ts`'s `test.env` or `test.setupFiles` — this runs before any module loads, replacing dotenv entirely in the test context
3. Do not rely on the `dotenv.config()` side effect being present in tests

**Detection:**
- `Error: DISCORD_BOT_TOKEN not set` even though `.env` exists
- Tests pass when `.env` is filled but fail in CI where `.env` is absent

**Phase:** Addressed in Phase 1 (Vitest configuration).

---

### Pitfall 9: In-Memory Conversation State (`Map`) Leaks Between Tests

**What goes wrong:**
`dm-handler.ts` maintains module-level `conversations: Map<string, ConversationState>` and `processingLocks: Map<string, Promise<void>>`. Because ESM modules are cached, these Maps persist across all tests in the same Vitest worker. A test that simulates a DM conversation leaves state that corrupts the next test's initial conditions.

**Prevention:**
1. Export a `clearConversations()` test-only function from `dm-handler.ts` (guard it with `if (process.env.NODE_ENV === 'test')`)
2. Or: call `vi.resetModules()` in `afterEach` to force fresh module instances — be aware this is slow (re-imports the full module graph each test)
3. Preferred: add a `beforeEach` fixture that directly clears the exported maps, avoiding full module re-import cost

**Detection:**
- Second test in a file receives a conversation history from the first test
- `processDmMessage` behaves differently depending on test order

**Phase:** Addressed in Phase 2 (Unit tests). Add cleanup utilities when writing DM handler tests.

---

## Minor Pitfalls

---

### Pitfall 10: `pnpm -F @assistme/bot-discord test` Does Not Exist — No Test Script Defined

**What goes wrong:**
Neither `packages/bot-discord/package.json` nor `packages/core/package.json` has a `test` script. Running `pnpm test` at the repo root fails silently or skips packages. This is not automatically fixed by installing Vitest.

**Prevention:**
1. Add `"test": "vitest run"` and `"test:watch": "vitest"` to `packages/bot-discord/package.json` and `packages/core/package.json` in the same commit that installs Vitest
2. Add a root-level `"test": "pnpm -r test"` script so `pnpm test` at the root runs tests across all packages
3. Verify `pnpm typecheck` still works after adding Vitest (Vitest's types should not conflict with project's tsconfig)

**Detection:**
- `pnpm test` outputs `Missing script: test` for each package
- CI `npm test` or `pnpm test` step exits 0 with no output (no tests ran)

**Phase:** Addressed in Phase 1 (Vitest setup). Done in the first commit.

---

### Pitfall 11: TypeScript `moduleResolution: "Bundler"` Conflicts With Vitest's Node Resolver

**What goes wrong:**
If `tsconfig.json` uses `"moduleResolution": "Bundler"` (common with TypeScript 5.x + ESM) but Vitest runs tests in Node environment, TypeScript path resolution differs from Vitest's runtime resolution. Imports like `'../utils/format.js'` resolve correctly for TSC but Vitest may fail to find them if `tsconfig.json`'s `paths` are not mirrored in `vitest.config.ts`.

**Prevention:**
1. In `vitest.config.ts`, use `vite-tsconfig-paths` plugin to automatically sync TypeScript path aliases into Vitest's resolver
2. Run `pnpm typecheck` and `pnpm test` as separate CI steps — a passing typecheck does not guarantee Vitest resolves modules correctly

**Detection:**
- `Error: Cannot find module '../utils/format.js'` in test output only (not in typecheck)
- Import works in production build but not in tests

**Phase:** Addressed in Phase 1 (Vitest configuration).

---

### Pitfall 12: Discord E2E Tests Cannot Run in CI Without Secrets — Must Be Explicitly Gated

**What goes wrong:**
E2E tests require `DISCORD_BOT_TOKEN` (dev bot), `DISCORD_GUILD_ID` (test server), and `DISCORD_CLIENT_ID`. GitHub Actions standard runners don't have these. If E2E tests are included in the default `pnpm test` run, CI fails on every PR from forks or when secrets are not configured.

**Prevention:**
1. Use a separate Vitest project configuration for E2E: `vitest.e2e.config.ts` that is only invoked via `pnpm test:e2e`
2. Add a CI job condition: `if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository` — only run E2E from trusted branches where secrets are available
3. At the start of each E2E test file, add a guard: `if (!process.env.DISCORD_BOT_TOKEN) { test.skip('E2E: No Discord token') }`

**Detection:**
- CI fails with `Error: DISCORD_BOT_TOKEN not set` on pull request from a fork
- E2E tests run during unit test phase, hitting real Discord API

**Phase:** Addressed in Phase 3 (CI setup) and Phase 4 (E2E tests).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Vitest config | `@assistme/core` mock split (Pitfall 1) | Add `resolve.alias` pointing to source, not dist |
| Phase 1: Vitest config | Env var throws at import (Pitfall 2) | Set fake env in `test.env` config immediately |
| Phase 1: Vitest config | No test scripts exist (Pitfall 10) | Add scripts in same commit as Vitest install |
| Phase 1: Vitest config | tsconfig path resolution (Pitfall 11) | Install `vite-tsconfig-paths` on day one |
| Phase 2: Handler unit tests | Private discord.js constructors (Pitfall 3) | Use plain object stubs with `vi.fn()` methods |
| Phase 2: Handler unit tests | Module-level client variable (Pitfall 4) | Call `setupXHandler(mockClient)` in `beforeEach` |
| Phase 2: Handler unit tests | Conversation Map leak (Pitfall 9) | Export clear function or use `vi.resetModules()` |
| Phase 2: Agent unit tests | Non-deterministic Claude responses (Pitfall 5) | Build Anthropic fixture factory first |
| Phase 3: Supabase local | pgvector extension missing (Pitfall 7) | Pin CLI version, add smoke query after reset |
| Phase 3: CI setup | Supabase Docker pull time (Pitfall 6) | Gate integration tests to separate CI job |
| Phase 3: CI setup | E2E in default test run (Pitfall 12) | Separate `vitest.e2e.config.ts` from day one |

---

## Sources

- Vitest issue #5633 — workspace package mock split in pnpm monorepos: https://github.com/vitest-dev/vitest/issues/5633
- Vitest issue #453 — ESM mocking does not work properly: https://github.com/vitest-dev/vitest/issues/453
- Vitest discussion #7592 — `vi.mock()` silently cannot find `__mocks__`: https://github.com/vitest-dev/vitest/discussions/7592
- discord.js discussion #6179 — Mocking Discord.js for unit testing (private constructors, cache graph): https://github.com/discordjs/discord.js/discussions/6179
- discord.js issue #3576 — Mocking Discord.js, v13+ private constructors: https://github.com/discordjs/discord.js/issues/3576
- Supabase discussion #9351 — Slow `supabase start` in GitHub Actions: https://github.com/orgs/supabase/discussions/9351
- Supabase issue #12680 — pgvector missing from Docker image: https://github.com/supabase/supabase/issues/12680
- Vitest docs — Mocking modules (ESM hoisting): https://vitest.dev/guide/mocking/modules
- Vitest config docs — `resolve.dedupe` workaround: https://vitest.dev/config/
- Supabase CLI issue #2724 — startup time on clean environment: https://github.com/supabase/cli/issues/2724
