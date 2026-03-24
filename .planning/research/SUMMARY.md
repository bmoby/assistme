# Project Research Summary

**Project:** Dev Environment & Automated Tests — Bot Discord
**Domain:** Testing infrastructure for a TypeScript/ESM Discord.js v14 bot in a pnpm monorepo
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

Building a test suite for the `packages/bot-discord` codebase is a well-defined but non-trivial infrastructure problem. The core challenge is not picking tools — Vitest is the unambiguous choice for ESM/TypeScript monorepos, and MSW is the recommended HTTP mock layer — but rather wiring them correctly for a codebase that has three distinct external dependencies (Discord gateway, Anthropic API, Supabase Postgres) each requiring a different mocking strategy at each test layer. The recommended approach is a strict three-tier pyramid: unit tests with zero external dependencies (all deps mocked via `vi.mock`), integration tests with real local Supabase (Docker) but mocked Claude API, and E2E tests with a real dev Discord bot. Each tier has its own filename convention, run script, and CI gate.

The most significant risk is that the existing codebase was not written with testability in mind: handlers use module-level singletons (`let discordClient: Client`, in-memory `conversations` Maps), and workspace packages resolve through `dist/` symlinks that can silently provide stale code to tests. These are not blocking problems, but they must be addressed in Phase 1 (Vitest config) and Phase 2 (handler unit tests) before broad coverage can be written. Discord.js v14's private constructors are an industry-wide pain point — the established community pattern of plain object stubs with `vi.fn()` methods is the correct approach; there is no maintained third-party library for this.

The overall technical risk is manageable. The Vitest + MSW + Supabase CLI stack has high-confidence documentation. The Discord mocking pattern is MEDIUM confidence (community-derived, no official library), but it is the pragmatic consensus. The highest-value investment is building the Claude API fixture factory and the Discord object factories early — these two shared assets unblock every downstream unit test. CI should be tiered from day one: unit tests run on every push with no secrets, integration tests run on PR with Supabase local, E2E tests are manual-only.

---

## Key Findings

### Recommended Stack

Vitest 4.1.1 with `pool: 'forks'` (ESM-safe default) is the correct test runner. The `projects` API in `vitest.config.ts` orchestrates all packages from the monorepo root — the old `vitest.workspace` file is deprecated since v3.2 and must not be used. Coverage is handled by `@vitest/coverage-v8` (the `c8` provider is dead, last published 3 years ago). MSW v2 handles all HTTP-layer mocking for Anthropic, Supabase REST, and OpenAI Whisper. Discord.js objects are mocked via in-house factory functions using plain objects cast to Discord types — no third-party library exists for discord.js v14 + Vitest. Supabase local (via Supabase CLI + Docker) provides a real Postgres + pgvector instance for integration tests.

**Core technologies:**
- **Vitest 4.1.1**: Test runner and assertion library — native ESM support, `projects` monorepo config, 3-5x faster than Jest for this workload
- **@vitest/coverage-v8**: Coverage reports — V8 provider with AST remapping as of v3.2, replaces dead `c8` package
- **msw ^2.x**: HTTP-layer mock for Anthropic API, Supabase REST, OpenAI — intercepts `fetch` at network level without module patching
- **vi.fn() factories**: Discord.js mock objects — plain objects with stubbed methods; the only viable approach for discord.js v14 private constructors
- **Supabase CLI + Docker**: Local Postgres + pgvector for integration tests — real migrations, real RPC functions, real RLS policies tested
- **GitHub Actions**: CI runner — tiered job matrix: unit (no secrets), integration (Supabase local), E2E (manual only)

### Expected Features

The test suite must deliver a working safety net for the highest-risk code paths: agent tool-call loops (dm-agent, tsarag, FAQ, exercise-reviewer), Discord handler business logic, and DB query correctness (pgvector hybrid search, RPC functions). The MVP focuses on the infrastructure and shared assets first; broad coverage is a second-milestone concern.

**Must have (table stakes):**
- Vitest configured for ESM + pnpm workspace resolution — without this, nothing runs
- Discord.js object factories (Message, Interaction, GuildMember) — every handler test depends on these
- Claude API mock with tool-use sequence fixtures — agents are the highest regression risk; tests are otherwise non-deterministic and expensive
- Supabase client mock for unit layer — prevents handler tests from requiring real DB credentials
- Supabase local Docker for integration layer — validates pgvector queries, RLS, RPC functions that mocks cannot cover
- Handler isolation: pure logic extracted from discord.js Client singleton — prerequisite for meaningful unit tests
- Test scripts in package.json with distinct modes (`test`, `test:integration`, `test:e2e`)
- TypeScript type safety in test files via `vitest-mock-extended`

**Should have (differentiators):**
- Agent tool-call fixture system — deterministic multi-turn sequences for dm-agent and tsarag agent tests (highest value for this specific codebase)
- Shared fixture library at `__tests__/fixtures/` — single source of truth for Discord and domain objects, eliminates per-test drift
- In-memory conversation state test helpers — `clearConversationState()` or injectable Maps to prevent Map leaks across tests
- GitHub Actions CI with tiered job matrix — unit always, integration on PR, E2E manual
- Coverage thresholds on handlers and agents only (not global) — enforces discipline without perverse incentives
- Separate dev Discord bot token + test server — enables E2E without polluting production channels

**Defer to a second milestone:**
- GitHub Actions CI setup — add after local tests are green
- Coverage threshold enforcement — set after baseline is established
- E2E with dev Discord bot — highest setup cost, lowest automation reliability
- Snapshot testing for agent return shapes — add incrementally after core tests are stable
- Performance/load testing — not the current pain point

### Architecture Approach

The architecture is a strict three-tier test pyramid. Each tier has independent run scripts, separate filename conventions (`*.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts`), and a clearly bounded dependency set. The directory layout places `__tests__/` co-located inside each package's `src/` directory, mirroring the source structure. Shared mock infrastructure lives in `packages/core/src/__tests__/mocks/` and is referenced by `bot-discord` tests via workspace aliases. The Vitest root config uses `projects: ['packages/*']` to automatically include new packages.

**Major components:**
1. **Vitest Root Config** (`vitest.config.ts`) — orchestrates all packages, defines per-layer include/exclude patterns, manages globalSetup for Docker services
2. **Discord.js Mock Layer** (`packages/bot-discord/src/__tests__/mocks/discord/`) — plain object stubs for Client, Guild, Message, Interaction, Channel, Member with `vi.fn()` methods
3. **Claude API Mock Layer** (`packages/core/src/__tests__/mocks/anthropic/`) — `vi.mock('@anthropic-ai/sdk')` with tool-use sequence factories for multi-turn agent loops
4. **Supabase Mock Layer** (`packages/core/src/__tests__/mocks/supabase/`) — chainable fluent proxy stub for unit tests only
5. **Fixture Factories** (`packages/core/src/__tests__/fixtures/` + `packages/bot-discord/src/__tests__/fixtures/`) — typed factory functions for Student, Exercise, Submission, Session, and all Discord objects
6. **Supabase Docker Service** — managed by `supabase CLI`, started via Vitest `globalSetup`, applies all migrations before integration tests run
7. **Discord Dev Environment** — separate bot token + test guild for E2E, manual only, not in default CI
8. **GitHub Actions CI Pipeline** (`.github/workflows/test.yml`) — tiered jobs: unit (no services), integration (Docker), E2E (manual trigger)

### Critical Pitfalls

1. **`vi.mock('@assistme/core')` silently no-ops in bot-discord tests** — pnpm symlinks cause a module instance split. Fix in Phase 1: add `resolve.alias: { '@assistme/core': path.resolve('../core/src/index.ts') }` in `vitest.config.ts` to import source directly, bypassing `dist/`.

2. **`getSupabase()` singleton throws at import time during unit tests** — any handler that transitively imports a DB function blows up before `it()` runs if `SUPABASE_URL` is absent. Fix in Phase 1: set fake values in `test.env` in `vitest.config.ts` immediately.

3. **discord.js v14 private constructors break mock instantiation** — `new Message(client, data)` is rejected by TypeScript strict mode. Fix in Phase 2: use plain object stubs typed as `Partial<Message>` with `vi.fn()` methods; never attempt to instantiate discord.js classes directly.

4. **Module-level `discordClient` variable bleeds between tests** — ESM module cache means the singleton persists across test files. Fix in Phase 2: call `setupDmHandler(mockClient)` in `beforeEach` and clear mocks; long-term, refactor to function-level dependency injection.

5. **Claude tool-use mock shape must be exact** — a malformed `tool_use` content block causes the agent loop to exit silently, producing false-negative tests. Fix in Phase 2: build a dedicated Anthropic fixture factory with the exact SDK response shape before writing any agent tests.

---

## Implications for Roadmap

Based on the dependency graph discovered in research, the work falls naturally into four sequential phases. Each phase has a clear completion criterion and unblocks the next.

### Phase 1: Foundation — Vitest Config + ESM Resolution

**Rationale:** Everything else depends on Vitest running correctly in the ESM monorepo. The four Phase-1 pitfalls (module alias split, env var throw, missing test scripts, tsconfig path conflict) must be resolved before any test can be written. This phase has zero test code — it is infrastructure only.

**Delivers:** `pnpm test:unit` runs an empty suite without errors. `pnpm typecheck` still passes. Fake env vars are set. `@assistme/core` resolves to source (not dist). `vite-tsconfig-paths` syncs TypeScript paths into Vitest resolver.

**Addresses:** Vitest config (table stakes), test scripts in package.json (table stakes)

**Avoids:** Pitfalls 1, 2, 8, 10, 11 (all Phase-1 config pitfalls)

### Phase 2: Shared Mocks + Handler Unit Tests

**Rationale:** The shared infrastructure (Claude mock, Supabase mock, Discord factories, domain fixtures) must exist before any test can be written. Building these once and reusing them across all handler and agent tests is the highest-leverage investment. Handler unit tests then exercise the highest-traffic code paths (dm-handler, faq, review-buttons) against deterministic mock dependencies.

**Delivers:** ~100 unit tests covering dm-handler, admin-handler, faq, review-buttons, agent tool-call routing. All tests run in <5s with no external services. Claude tool-use sequences are deterministic.

**Addresses:** Claude API mock, Discord.js factories, handler isolation, agent tool-call fixture system, conversation state test helpers (all table-stakes and high-value differentiator features)

**Avoids:** Pitfalls 3, 4, 5, 9 (discord.js private constructors, module-level client, Claude non-determinism, Map leak)

**Uses:** Vitest, MSW, `vi.mock`, factory functions

### Phase 3: Supabase Local + Integration Tests + CI

**Rationale:** With unit tests stable, add the integration layer that validates DB correctness (pgvector hybrid search, RPC functions, RLS policies). These cannot be validated with mocks. CI is added in this phase so integration tests run automatically on PR — gating Docker usage to the integration job only.

**Delivers:** ~30 integration tests covering DB modules (students, exercises, submissions, knowledge search) and agent behavior with real DB state. GitHub Actions CI with tiered unit + integration jobs. Coverage thresholds on handlers and agents.

**Addresses:** Supabase local Docker, GitHub Actions tiered CI, coverage thresholds, pgvector validation

**Avoids:** Pitfalls 6, 7 (Docker pull time in CI, pgvector extension/dimension issues)

**Implements:** Supabase Docker Service component, GitHub Actions CI Pipeline component

### Phase 4: E2E Discord Dev Environment (Optional / On-Release)

**Rationale:** E2E tests require a second Discord bot token, a dedicated test server, and manual coordination. They are the most expensive to set up and the least reliable for automation. They provide value for smoke-testing critical flows (DM submission, button interactions) before production releases, but must not block PRs.

**Delivers:** ~10 E2E test scenarios for critical flows. `pnpm test:e2e` connects real dev bot to test Discord server. Separate `vitest.e2e.config.ts` ensures these never run in default CI.

**Addresses:** Separate dev Discord bot token + test server (differentiator feature), E2E test helpers

**Avoids:** Pitfall 12 (E2E secrets in CI, blocking forks/PRs)

### Phase Ordering Rationale

- Phase 1 before everything: Vitest config bugs cause silent false passes or import-time crashes that make all subsequent test writing futile.
- Phase 2 before Phase 3: Unit tests must be green and stable before introducing Docker complexity. Debugging a flaky integration test is much harder if the underlying unit behavior is also uncertain.
- Phase 3 before Phase 4: Integration tests validate that the real DB layer works before trusting E2E results that depend on it.
- Phase 4 is decoupled: it can be deferred indefinitely. Unit + integration coverage on the critical paths is the practical safety net.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Handler isolation refactor — current `dm-handler.ts` and `admin-handler.ts` architecture needs analysis before deciding on dependency injection scope (function params vs. module reset vs. full DI)
- **Phase 3:** Supabase CLI version pinning and pgvector smoke query — verify exact CLI version that bundles pgvector 0.7+, confirm migration ordering for `012_openai_embeddings_1536.sql`

Phases with standard patterns (skip research-phase):
- **Phase 1:** Vitest ESM + pnpm workspace setup is thoroughly documented with official sources. Well-trodden path.
- **Phase 4:** Discord dev bot setup is manual configuration work, not a research problem. Follow Pitfall 12 prevention pattern directly.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vitest 4.1.1, MSW v2, Supabase CLI all verified against official docs. Version constraints (pool: forks, coverage-v8 over c8) confirmed from official release notes and issue tracker. |
| Features | MEDIUM | Discord.js testing ecosystem is sparse; feature set synthesized from community discussions and official Vitest/Supabase docs. No single authoritative source for "complete Discord bot test setup." |
| Architecture | MEDIUM-HIGH | Three-tier pyramid and component layout are HIGH confidence (official patterns). Discord mock construction strategy is MEDIUM (community-derived, confirmed in discord.js official discussion #6179). Supabase integration isolation (data prefixing + afterAll cleanup) is MEDIUM (community pattern, no official guide). |
| Pitfalls | HIGH | All 5 critical pitfalls are verified against specific GitHub issues (vitest-dev/vitest #5633, discord.js #6179, supabase/cli #2724). Phase warnings are grounded in the actual codebase structure. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Handler isolation scope**: It is unclear from research alone how much refactoring `dm-handler.ts` and `admin-handler.ts` require before meaningful unit tests are possible. The module-level singleton pattern may require a small targeted refactor (pass client as parameter to the main exported function) rather than full DI. Assess during Phase 2 planning.
- **`@shoginn/discordjs-mock` viability**: The library was flagged as potentially usable for discord.js v14. It was not fully evaluated due to maintenance uncertainty. If manual factory construction proves too burdensome in Phase 2, revisit this dependency.
- **Supabase CLI version pinning**: The exact minimum CLI version that reliably bundles pgvector 0.7+ needs to be confirmed against the project's `supabase/config.toml`. Validate during Phase 3 setup.
- **Agent loop test patterns for Tsarag agent**: Research covered dm-agent in detail but Tsarag agent tool-call sequences were not specifically analyzed. The same factory pattern applies, but Tsarag's specific tool set needs to be enumerated during Phase 2 fixture work.

---

## Sources

### Primary (HIGH confidence)
- Vitest 4.1.1 official documentation: https://vitest.dev/guide/projects
- Vitest 4.0 release announcement: https://vitest.dev/blog/vitest-4
- Vitest 3.2 release (workspace deprecation, v8 AST remapping): https://vitest.dev/blog/vitest-3-2.html
- Vitest pool documentation: https://vitest.dev/config/pool
- Vitest request mocking guide: https://vitest.dev/guide/mocking/requests
- Vitest Global Setup Config: https://vitest.dev/config/globalsetup
- MSW official documentation: https://mswjs.io/docs/
- MSW Node.js integration: https://mswjs.io/docs/integrations/node/
- Supabase local development: https://supabase.com/docs/guides/local-development
- Vitest issue #5633 — workspace package mock split: https://github.com/vitest-dev/vitest/issues/5633

### Secondary (MEDIUM confidence)
- discord.js Discussion #6179 — Mocking Discord.js for unit testing (private constructors): https://github.com/discordjs/discord.js/discussions/6179
- Supabase Discussion #16415 — Local integration testing patterns: https://github.com/orgs/supabase/discussions/16415
- Vitest 3 Monorepo Setup — community article: https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html
- Testing Supabase RLS with Vitest — practitioner blog: https://index.garden/supabase-vitest/
- AI SDK Core Testing (Vercel AI SDK patterns, applicable to Anthropic SDK): https://ai-sdk.dev/docs/ai-sdk-core/testing

### Tertiary (LOW confidence)
- jest-discordjs-mocks on npm — rejected; targets Jest + discord.js v12/v13
- @shoginn/discordjs-mock on npm — deferred; maintenance status unclear
- Corde E2E library — rejected; unmaintained since Nov 2022, discord.js v13 era
- Adding Tests to Your Discord Bot — DEV Community: https://dev.to/kevinschildhorn/adding-tests-to-your-discord-bot-discord-bot-series-part-3-513

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
