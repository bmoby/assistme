# Feature Landscape: Discord.js Bot Testing Infrastructure

**Domain:** Automated testing infrastructure for a Discord.js v14 bot in a TypeScript/ESM monorepo
**Researched:** 2026-03-24
**Confidence:** MEDIUM — Discord.js testing ecosystem is sparse and fragmented; patterns synthesized from community discussions, official Vitest docs, and analogous testing infrastructure projects.

---

## Table Stakes

Features the testing setup must have or it provides no reliable safety net. Missing any of these means tests are either impossible to write, silently wrong, or untrusted.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Vitest configured for ESM + pnpm workspaces | Without proper ESM config, tests fail at import resolution. The monorepo has workspace packages (`@assistme/core`) that must resolve correctly. | Med | Requires `vitest.config.ts` at root with `projects: ['packages/*']`, `resolve.conditions` set for Node ESM, and `moduleNameMapper` or `alias` for workspace paths. |
| Discord.js object factories (Message, Interaction, GuildMember, Guild, Channel) | Every handler test needs Discord objects. Without factories, every test file invents its own object shape, leading to drift and silent type errors. | Med | No maintained v14-compatible library exists (Corde is v13-era, `@shoginn/discordjs-mock` partially covers this). Must build in-house. Approach: populate real discord.js Client cache via `.set()` on Collections — avoids divergence between mock and real behavior. |
| Claude API mock (vi.mock for `@anthropic-ai/sdk`) | Agents (DM Agent, Tsarag, FAQ, Exercise Reviewer) call Claude synchronously. Without a mock, unit tests make real API calls, cost money, and are non-deterministic. | Low | `vi.mock('@anthropic-ai/sdk')` with configurable fixture responses per test. Mock must support tool-use response shape (array of `tool_use` content blocks). |
| Supabase client mock for unit tests | DB calls are injected via `@assistme/core` imports. Unit tests must not hit a real DB. Without this mock, unit tests are actually integration tests in disguise. | Low | `vi.mock('@supabase/supabase-js')` or mock the `@assistme/core/db` module layer directly. Preferred: mock at the core DB function boundary, not the Supabase client, to stay closer to real behavior. |
| Supabase local via Docker for integration tests | Integration tests need a real Postgres instance with pgvector and the project's migration history applied. Mocking the DB at integration level defeats the purpose. | Med | `supabase start` (Supabase CLI) starts local instance on Docker. Migrations applied via `supabase db reset`. Tests write real data with unique prefixes per suite, no full reset between tests. |
| Handler isolation: business logic extractable from discord.js Client | The current handler architecture imports the discord.js Client as a singleton. If handler functions cannot be called without a live Client, unit testing is impossible without major restructuring. | Med | Requires extracting pure logic functions from handler files. Pattern: `handler(ctx, deps)` where `deps` is injected. This is not a full DI framework — just function-level dependency injection at the boundary. |
| Test scripts in package.json with clear modes | `pnpm test` (all), `pnpm test:unit` (fast, no external), `pnpm test:integration` (needs Docker). Without distinct scripts, developers run slow integration tests when they only need unit feedback. | Low | Three npm scripts minimum. Unit tests: <5s. Integration tests: allow ~30s for DB roundtrips. |
| TypeScript type safety in tests | Tests that compile are not the same as tests that are type-correct. Loose types in test fixtures cause false-negative test results. | Low | `vitest-mock-extended` adds type-safe mock argument checking on top of `vi.fn()`. Required for mocking typed interfaces from `@assistme/core`. |

---

## Differentiators

Features that go beyond the minimum and make the test suite actively useful rather than just present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Shared fixture library at `packages/bot-discord/src/__tests__/fixtures/` | Reusable factories for Discord objects (Guild, Channel, Member, Message, ButtonInteraction, SlashCommandInteraction) eliminate per-file boilerplate and enforce consistency. When discord.js upgrades, fix one place. | Med | Factory functions, not classes. Each factory accepts partial overrides: `makeMessage({ content: 'test' })`. Uses real discord.js types from `discord.js` package, not separate interfaces. |
| Agent tool-call fixture system | The four agents (DM Agent, Tsarag, FAQ, Exercise Reviewer) use Claude tool-use loops. Testing agent behavior requires controlling which tools Claude "calls" in sequence. Deterministic tool call sequences mean deterministic agent behavior. | High | Pattern: mock `anthropic.messages.create` to return a sequence of responses from a fixture array. Each test scenario defines the full tool-call chain: `[tool_use('get_student_progress', {...}), text('Here is your progress')]`. This is the most valuable test feature for this codebase specifically. |
| Separate dev Discord bot token + test server | Real E2E testing requires a real bot connected to a real server. A separate bot token prevents test runs from polluting the production #annonces, sending DMs to real students, or triggering real Supabase writes in prod. | Med | Env var `DISCORD_BOT_TOKEN_DEV`, a private Discord server with the same channel/role structure as prod (cloned manually). This is a configuration requirement, not a code requirement. |
| GitHub Actions CI with tiered job matrix | Unit tests run on every push (no secrets needed). Integration tests run on PR to main (need `SUPABASE_URL`/`KEY` for local DB, no Discord token). E2E tests run manually or on release. CI that requires a Discord token in CI is fragile — Discord rate-limits and token exposure are real risks. | Med | Three jobs: `test-unit` (always runs), `test-integration` (needs Supabase secrets), `test-e2e` (manual trigger only, uses `DISCORD_BOT_TOKEN_DEV`). Unit + integration cover the safety-critical path automatically. |
| Coverage thresholds enforced in CI | Coverage without thresholds is decoration. Enforced thresholds on handler and agent files prevent coverage regression as new code is added. | Low | Vitest v8 coverage provider (fastest, AST-based remapping as of v3.2 makes it as accurate as Istanbul). Thresholds: `lines: 70`, `functions: 80` for `packages/bot-discord/src/handlers/` and `packages/core/src/ai/formation/`. Not global — overly broad thresholds create perverse incentives to write trivial tests. |
| In-memory conversation state test helpers | The dm-handler, admin-handler, and FAQ handler all maintain in-memory conversation state maps (20-message windows, 30-60 min TTL). Tests that don't control this state get unpredictable multi-turn behavior. | Med | Expose a `clearConversationState()` test helper in each handler module (export behind `if (process.env.NODE_ENV === 'test')`), or refactor state into injectable maps passed to handlers. Second option is cleaner. |
| Snapshot testing for agent response shape | Agent functions return structured objects (with `response`, `submissionId`, `proposedAction`, etc.). Snapshot tests catch regressions in response shape without manually asserting every field. | Low | `expect(result).toMatchSnapshot()` for agent return objects. Useful for exercise-reviewer and dm-agent outputs. Use with discipline — snapshots that capture too much become maintenance burdens. |

---

## Anti-Features

Things to deliberately not build in this testing milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full discord.js Client mock replacing the real Client | Maintaining a complete Client mock is a second codebase. When discord.js updates, the mock drifts silently. The community consensus (confirmed in the official discord.js discussions) is: mock the API layer, not the Client. | Populate real Client collections using `.set()` on Maps/Collections. Test business logic extracted into pure functions. |
| Corde or distest as E2E framework | Corde's last release is Nov 2022 (v4.8.0), targets discord.js v13 message commands, not slash commands or button interactions. Distest is Python-first. Neither is compatible with this stack. | Roll minimal custom E2E: a test runner script that connects the dev bot to the test server, sends messages/interactions via the Discord REST API with a user account bot, and asserts channel output. Scope E2E to 2-3 critical flows only. |
| Mocking Supabase at the HTTP level (MSW, nock) | Intercepting HTTP to Supabase means the mock must know Supabase's wire format. This is fragile and high-maintenance. | Mock at the `@assistme/core/db` function boundary for unit tests. Use real local Supabase for integration tests. |
| Testing Telegram bots (admin or public) | Out of scope per PROJECT.md. Adding Telegram tests here dilutes focus and creates a much larger scope. | Separate milestone if needed. |
| Performance/load testing | Not the current pain point. The pain is zero feedback on correctness, not latency. | Defer entirely. |
| Test coverage for cron scheduling logic | Cron jobs are thin wrappers: they call `node-cron` with a schedule string and a handler. The schedule string is a constant, not logic. | Test the handler functions the crons call, not the cron registration itself. |
| Visual regression / UI tests | This is a backend-only bot. No UI to regress. | N/A |
| Global 90%+ coverage threshold | A global threshold incentivizes writing tests for trivial utilities (format.ts, auth.ts, message-split.ts) to hit the number, while leaving complex agent logic undertested. | Targeted per-directory thresholds on handlers and agents only. |
| Automated secrets rotation in CI for Discord token | Token rotation is an ops concern, not a testing concern. CI E2E with a real Discord token is fragile by design (rate limits, token invalidation). | Gate E2E tests as manual/on-release only. Unit and integration tests are the automated safety net. |

---

## Feature Dependencies

```
Vitest config (ESM + workspace)
  └── All other test features depend on this being correct first

Discord.js object factories
  └── Handler unit tests (dm-handler, admin-handler, faq, review-buttons)
  └── Command unit tests (announce, approve, session, add-student)

Claude API mock (vi.mock anthropic-sdk)
  └── Agent tool-call fixture system
      └── DM Agent tests
      └── Tsarag Agent tests
      └── FAQ Agent tests
      └── Exercise Reviewer tests

Supabase client mock (unit layer)
  └── Handler unit tests that touch DB functions from @assistme/core

Supabase local Docker (integration layer)
  └── Integration tests for DB modules (students, exercises, knowledge hybrid search)
  └── Integration tests for agents with real DB state

Handler isolation (pure function extraction)
  └── Handler unit tests
  └── (Without this, handler tests require a full discord.js Client setup)

Shared fixture library
  └── Any test that creates Discord objects
  └── Must be built before broad test coverage is written

Separate dev bot token + test server
  └── E2E tests
  └── Manual smoke testing during development

CI tiered job matrix
  └── Coverage thresholds
  └── Requires unit tests + integration tests already passing
```

---

## MVP Recommendation

For the first milestone, prioritize the features that unblock everything else:

1. **Vitest config** — ESM + pnpm workspace resolution. Without this, nothing runs.
2. **Claude API mock** — Agents are the most complex logic and the highest regression risk. Unblocking agent unit tests is the highest ROI.
3. **Discord.js object factories** — Shared, not per-test. Build once, reuse across all handler tests.
4. **Handler isolation refactor** — Extract pure business logic from dm-handler, admin-handler, faq, review-buttons. This enables meaningful unit tests for the highest-traffic code paths.
5. **Agent tool-call fixture system** — DM Agent and Tsarag Agent are multi-step, stateful workflows. Fixture-driven sequences make them deterministic.
6. **Supabase local Docker + integration tests for DB layer** — Validates that DB queries, hybrid search RPC, and pgvector operations work correctly before deployment.

Defer to a second milestone:
- **CI GitHub Actions** — Can be added once local tests are green.
- **Coverage thresholds** — Enforce after baseline is established, not before.
- **E2E with dev bot** — Highest setup cost, lowest automation reliability. Useful for smoke testing, not CI.
- **Snapshot testing** — Add incrementally after core tests are stable.

---

## Sources

- [Mocking discord.js for Unit Testing — Official discord.js Discussion #6179](https://github.com/discordjs/discord.js/discussions/6179) — MEDIUM confidence (community discussion, includes core maintainer input)
- [Mocking External APIs in Agent Tests — Scenario/LangWatch](https://langwatch.ai/scenario/testing-guides/mocks/) — MEDIUM confidence (general agent testing patterns, not Discord-specific)
- [Vitest Projects (Monorepo) Guide](https://vitest.dev/guide/projects) — HIGH confidence (official documentation)
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html) — HIGH confidence (official documentation)
- [Supabase Local Development Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) — HIGH confidence (official documentation)
- [jest-discordjs-mocks on npm](https://www.npmjs.com/package/jest-discordjs-mocks) — LOW confidence (last update unknown, Jest-oriented not Vitest)
- [@shoginn/discordjs-mock on npm](https://www.npmjs.com/package/@shoginn/discordjs-mock) — LOW confidence (maintenance status unclear)
- [Adding Tests to Your Discord Bot — DEV Community](https://dev.to/kevinschildhorn/adding-tests-to-your-discord-bot-discord-bot-series-part-3-513) — LOW confidence (interface-based mock pattern, useful reference)
- [Corde E2E Discord Testing Library](https://github.com/cordejs/corde) — LOW confidence (abandoned, last release Nov 2022, v13 era)
- [Implementing Automated Testing Pipelines for Discord Bots](https://app.studyraid.com/en/read/7183/176841/implementing-automated-testing-pipelines) — LOW confidence (generic overview, no code examples)
