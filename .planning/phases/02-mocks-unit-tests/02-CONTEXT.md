# Phase 2: Mocks + Unit Tests - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the shared mock layer (Discord.js factories, Claude API fixtures, Supabase mocks) and write exhaustive unit tests for every Discord handler and AI agent. All tests run in isolation with zero external service calls. Phase delivers: reusable mock infrastructure + comprehensive unit test suite covering handlers, agents, and slash commands.

</domain>

<decisions>
## Implementation Decisions

### Handler Refactor Approach
- **D-01:** Thin wrapper approach — handlers stay as-is. Tests mock imports via `vi.mock()` and test handler functions directly by passing fake Discord objects. Minimal production code changes.
- **D-02:** Lazy initialization where needed — if `vi.mock()` can't prevent a side effect (e.g., Discord Client constructor), add minimal lazy init (`getClient()` pattern) to that specific module. Only change what's actually broken.
- **D-03:** Skip and defer untestable handlers — if a handler is so tightly coupled that vi.mock() + fake objects isn't enough, mark it as a gap for a later phase. Don't invest in invasive refactors in Phase 2.

### Mock Architecture
- **D-04:** `vi.mock()` only — mock at module import level for all external services (Supabase, Claude API, Discord.js). No MSW v2 in Phase 2. Fastest execution, no extra dependency.
- **D-05:** Full builder pattern for Discord.js factories — `MessageBuilder().withContent('test').withAuthor(user).inChannel(ch).build()` chainable API that builds complete discord.js-shaped objects. Ergonomic for complex test scenarios.
- **D-06:** Shared mocks location: `packages/bot-discord/src/__mocks__/` — co-located with the tests that use them, inside the bot-discord package.

### Agent Fixture Design
- **D-07:** Static JSON files for Claude API response fixtures — pre-built response arrays in `packages/bot-discord/src/__mocks__/fixtures/`. Simple to read, easy to version.
- **D-08:** Thorough coverage per agent — multiple scenarios per agent covering main flows, error paths, and edge cases. Not just happy paths.

### Test Coverage Scope
- **D-09:** Exhaustive coverage — cover every code path: all message types, all agent tools, all error branches, edge cases (empty input, rate limiting, concurrent messages). Maximum confidence.
- **D-10:** No numeric coverage threshold in Phase 2 — write thorough tests but don't enforce a percentage. Coverage thresholds come in Phase 3 with CI.

### Claude's Discretion
- Which specific handlers need lazy init vs pure vi.mock() (assess during research)
- Builder API design details (method names, chaining ergonomics)
- JSON fixture file organization and naming within `__mocks__/fixtures/`
- Which edge cases are worth testing vs diminishing returns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `specs/04-bot-discord/SPEC.md` — Bot Discord spec (handlers, commands, agents architecture)
- `specs/01-cerveau-central/SPEC.md` — Core package spec (DB, AI, types)

### Research Findings
- `.planning/research/STACK.md` — Vitest 4.x config, MSW v2, discord.js mock strategy
- `.planning/research/PITFALLS.md` — Critical pitfalls: `@assistme/core` alias, `getSupabase()` env crash, ESM pool config
- `.planning/research/ARCHITECTURE.md` — Test architecture: component boundaries, mock layers, build order

### Codebase Maps
- `.planning/codebase/TESTING.md` — Testing strategy, mocking patterns, fixture factories, coverage targets
- `.planning/codebase/ARCHITECTURE.md` — Handler layer, agent layer, singleton patterns
- `.planning/codebase/STRUCTURE.md` — Directory layout of all packages

### Phase 1 Artifacts
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (co-located tests, .test.ts suffix, single vitest.config.ts)
- `vitest.config.ts` — Root Vitest config with projects API (created in Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vitest.config.ts` — Root config with projects API, `@assistme/core` alias, fake env vars (Phase 1)
- 3 smoke tests in `packages/core/src/` and `packages/bot-discord/src/` (Phase 1)
- `packages/core/src/types/index.ts` — Full TypeScript interfaces for all domain entities (Task, Student, Session, etc.)

### Established Patterns
- ESM imports with explicit `.js` extension throughout codebase
- `getSupabase()` lazy init pattern in `packages/core/src/db/client.ts` — reads env at call time, not import
- Agent pattern: register tools, Claude calls tools in loop (max N iterations), extract final text
- Handlers: `dm-handler.ts`, `admin-handler.ts`, `faq.ts`, `review-buttons.ts` — all in `packages/bot-discord/src/handlers/`
- Slash commands in `packages/bot-discord/src/commands/admin/` — `/session`, `/session-update`

### Integration Points
- Handlers import from `@assistme/core` (AI functions, DB functions, types)
- Agents use `askClaude()` with tool definitions — mock at this level to test tool routing
- Discord client singleton in `packages/bot-discord/src/index.ts` — may need lazy init for test isolation

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the decisions above. Research findings and codebase maps provide strong guidance on mock patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-mocks-unit-tests*
*Context gathered: 2026-03-24*
