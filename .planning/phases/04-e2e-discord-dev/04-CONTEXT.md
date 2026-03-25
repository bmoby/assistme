# Phase 4: E2E Discord Dev - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Smoke-test critical bot flows against a real Discord test server using a dedicated dev bot and a second bot as test user. Phase delivers: E2E test infrastructure, 3 thorough E2E scenarios (DM student flow, exercise submission, FAQ), configurable Claude API (mocked by default, real with --live flag).

</domain>

<decisions>
## Implementation Decisions

### Dev Bot Setup
- **D-01:** Separate Discord bot application already exists for dev/testing (user has it).
- **D-02:** Dev bot token stored in `.env.test` file (git-ignored). Tests load it at startup.

### Test Server Structure
- **D-03:** Test Discord server already exists (user has it).
- **D-04:** Server channels mirror all production channels (ОБЩЕЕ, ОБУЧЕНИЕ, ПОДЫ, АДМИН, exercise channels, forum for sessions). Full mirror, not minimal.
- **D-05:** Test server guild ID and channel IDs stored in `.env.test` alongside bot tokens.

### Test User Strategy
- **D-06:** Second bot acts as the test user (simulated student). Fully automated — no human interaction needed during test runs.
- **D-07:** Second bot application already exists (user has it). Token stored in `.env.test`.

### E2E Scope
- **D-08:** Thorough coverage per scenario — multiple paths including edge cases, not just happy paths.
- **D-09:** Claude API is configurable: mocked by default (MSW fixtures, deterministic, free), real API with `--live` flag for occasional full-stack testing.

### Claude's Discretion
- E2E test file naming convention (`.e2e.test.ts` suffix per Phase 1 exclude patterns)
- Vitest E2E project configuration details
- MSW handler design for E2E Claude mock vs --live passthrough
- Test data seeding strategy (Supabase local for E2E or fixtures only)
- Timeout values for E2E tests (Discord latency + Claude API latency in --live mode)
- `.env.test` variable naming conventions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `specs/04-bot-discord/SPEC.md` — Bot Discord spec (handlers, commands, agents, channel structure)

### Phase 3 Artifacts
- `.github/workflows/test.yml` — CI pipeline with E2E workflow_dispatch placeholder
- `test/msw-server.ts` — MSW v2 server (reusable for E2E Claude mock)
- `test/integration-helpers.ts` — Test isolation helpers (reusable for E2E data cleanup)
- `test/globalSetup.ts` — Supabase lifecycle (E2E may need DB for student seeding)

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Handler layer, agent layer, event flow
- `.planning/codebase/STRUCTURE.md` — Directory layout, channel structure

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Test conventions (co-located, .test.ts, Vitest projects API)
- `.planning/phases/02-mocks-unit-tests/02-CONTEXT.md` — Mock architecture, builder pattern, fixture design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/bot-discord/src/__mocks__/discord/builders.ts` — Discord.js builders (Message, Interaction, GuildMember)
- `test/msw-server.ts` — MSW v2 server with Anthropic handler factories
- `test/integration-helpers.ts` — createTestClient, createTestRunId, cleanupTestData
- `vitest.config.ts` — Projects API with exclude patterns for `.e2e.test.ts`
- `.github/workflows/test.yml` — E2E workflow_dispatch job (placeholder ready)

### Established Patterns
- Bot reads `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_CLIENT_ID` from env
- Handlers emit events that are testable (dm-handler, admin-handler, faq, review-buttons)
- `_clearStateForTesting()` exports on dm-handler and admin-handler for isolation

### Integration Points
- E2E test bot connects via discord.js Client (same as production bot)
- Test user bot connects via separate discord.js Client
- Both bots join the same test guild
- Tests orchestrate: test user sends message → wait → assert bot response

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the decisions above. The E2E pattern is: second bot sends message → wait for dev bot response → assert content/behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-e2e-discord-dev*
*Context gathered: 2026-03-25*
