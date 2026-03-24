# Phase 2: Mocks + Unit Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 02-mocks-unit-tests
**Areas discussed:** Handler refactor depth, Mock architecture, Agent fixture design, Test coverage scope

---

## Handler Refactor Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Thin wrapper (Recommended) | Handlers stay as-is. Tests mock the imports (vi.mock) and test the handler functions directly by passing fake Discord objects. Minimal production code changes. | ✓ |
| Extract pure functions | Refactor each handler to separate Discord-coupled code from business logic. More testable but touches working production code. | |
| Dependency injection | Pass Discord client, DB client, AI client as params instead of importing singletons. Most testable but most invasive refactor. | |
| You decide | Claude picks the approach based on how coupled each handler actually is. | |

**User's choice:** Thin wrapper (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock() hoisting only | Mock modules before import using vi.mock(). No production code changes. | |
| Lazy init where needed | If vi.mock() can't prevent a side effect, add minimal lazy init (getClient() pattern) to that specific module. Only change what's actually broken. | ✓ |
| You decide | Claude assesses each singleton during research and picks the minimal approach. | |

**User's choice:** Lazy init where needed

| Option | Description | Selected |
|--------|-------------|----------|
| Skip and defer | Mark it as a gap, come back in Phase 3 or later. Keep Phase 2 focused on what's testable now. | ✓ |
| Targeted refactor | If a specific handler needs a small refactor to become testable, do it. But cap at ~30 lines of production code change per handler. | |
| You decide per handler | Claude evaluates case by case during planning. | |

**User's choice:** Skip and defer

---

## Mock Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| vi.mock() only (Recommended) | Mock at module import level. Simpler, no extra dependency, Vitest-native. Fastest test execution. | ✓ |
| MSW v2 for HTTP | Intercept at network level using MSW handlers. More realistic but adds msw dependency and setup/teardown complexity. | |
| Hybrid | vi.mock() for Discord.js and simple modules. MSW for Supabase REST and Claude API where HTTP behavior matters. | |

**User's choice:** vi.mock() only (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal plain objects | createMessage({ content: 'test' }) returns a plain object with only the properties tests need. Fast to write. | |
| Full builder pattern | MessageBuilder().withContent('test').withAuthor(user).inChannel(ch).build() — chainable API. Most ergonomic for complex test scenarios. | ✓ |
| You decide | Claude picks based on what tests actually need during planning. | |

**User's choice:** Full builder pattern

| Option | Description | Selected |
|--------|-------------|----------|
| packages/bot-discord/src/__mocks__/ | Inside the bot-discord package. Co-located with the tests that use them. | ✓ |
| packages/bot-discord/test-utils/ | Separate test-utils directory at package root. Clear boundary between source and test infrastructure. | |
| Shared test package | New packages/test-utils/ workspace package. Reusable across core and bot-discord. | |

**User's choice:** packages/bot-discord/src/__mocks__/

---

## Agent Fixture Design

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript fixture builders | Typed builders that produce Anthropic SDK response shapes. Discoverable, autocomplete-friendly. | |
| Static JSON files | Pre-built response arrays in test fixtures. Simple to read, easy to version. | ✓ |
| Sequence builders | Chain multi-turn sequences declaratively. Most ergonomic but more code to build. | |

**User's choice:** Static JSON files

| Option | Description | Selected |
|--------|-------------|----------|
| One happy path per agent | Proves the test infra works, details in Phase 3. | |
| Happy + one error per agent | Each agent gets a happy path fixture AND one error/edge case. | |
| Thorough coverage | Multiple scenarios per agent covering main flows, error paths, and edge cases. | ✓ |

**User's choice:** Thorough coverage

---

## Test Coverage Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Primary routing + errors | Each handler: test that the right agent/function gets called for each message type, plus error handling paths. | |
| Exhaustive | Cover every code path: all message types, all agent tools, all error branches, edge cases. Maximum confidence. | ✓ |
| Minimum viable | Exactly what success criteria says: one test per handler covering primary routing logic. Fastest to ship. | |

**User's choice:** Exhaustive

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, enforce threshold | Set a coverage percentage in vitest.config.ts. Tests fail if coverage drops below. | |
| No threshold yet | Write thorough tests but don't enforce a number. Coverage thresholds come in Phase 3 with CI. | ✓ |
| You decide | Claude sets a threshold if it makes sense after seeing the actual coverage. | |

**User's choice:** No threshold yet

---

## Claude's Discretion

- Which specific handlers need lazy init vs pure vi.mock()
- Builder API design details
- JSON fixture file organization and naming
- Which edge cases are worth testing vs diminishing returns

## Deferred Ideas

None — discussion stayed within phase scope.
