---
phase: 03-integration-ci
plan: 03
subsystem: testing
tags: [vitest, supabase, integration-tests, coverage, anthropic-sdk, dm-agent]

# Dependency graph
requires:
  - phase: 03-integration-ci/03-01
    provides: vitest.config.ts with integration projects (core-integration, bot-discord-integration), test/integration-helpers.ts, globalSetup.ts
  - phase: 02-mocks-unit-tests
    provides: anthropic-mock.ts with getAnthropicMockFactory() pattern, dm-agent unit tests

provides:
  - DM Agent integration test with real Supabase student data and mocked Claude API
  - Coverage thresholds enforced via vitest.config.ts per-glob thresholds (handlers + ai/formation)

affects:
  - 03-04 (CI plan reads vitest.config.ts thresholds)
  - future plans that add new handlers/agents (thresholds enforce coverage floor)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Integration test: mock @anthropic-ai/sdk with ESM default import pattern before importing the module under test"
    - "Seed test data in beforeAll with TEST_RUN_ID prefix in name column, clean via cleanupTestData in afterAll"
    - "Non-existent student path: agent returns early without calling Claude, assert mockCreate.not.toHaveBeenCalled()"
    - "Per-glob coverage thresholds in Vitest 3+: thresholds block inside coverage with glob keys"

key-files:
  created:
    - packages/core/src/ai/formation/dm-agent.integration.test.ts
    - .planning/phases/03-integration-ci/deferred-items.md
  modified:
    - vitest.config.ts

key-decisions:
  - "vi.mock('@anthropic-ai/sdk') declared before any import that loads the SDK — ESM hoisting requires this ordering"
  - "vi.mock('../../ai/embeddings.js') returns null to skip embedding server dependency in integration tests"
  - "Per-glob thresholds verified to pass with current unit test suite — no threshold failures, only pre-existing core-import.test.ts timeout"
  - "core-import.test.ts timeout is pre-existing (Phase 1 commit a02adab), out of scope, logged to deferred-items.md"

patterns-established:
  - "Integration test pattern: seed → call agent → verify response → cleanup; Claude stays mocked, DB stays real"
  - "Coverage threshold pattern: per-glob for handlers/** and ai/formation/**, tuned to current coverage levels"

requirements-completed: [INTG-04, CI-04]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 03 Plan 03: DM Agent Integration Test + Coverage Thresholds Summary

**DM Agent integration test with real Supabase student data (mocked Claude API) proving the full DB read path, plus per-glob coverage thresholds (handlers 70/65/70/70, agents 70/60/70/70) enforced in vitest.config.ts**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T09:35:00Z
- **Completed:** 2026-03-25T09:50:00Z
- **Tasks:** 2
- **Files modified:** 2 (+ 1 deferred-items.md created)

## Accomplishments

- DM Agent integration test seeds a real `students` row, calls `runDmAgent` with real Supabase DB queries (Claude is mocked), verifies 3 paths: simple end_turn, tool use round-trip, non-existent student early exit
- Coverage thresholds added to `vitest.config.ts` as per-glob thresholds targeting `packages/bot-discord/src/handlers/**` and `packages/core/src/ai/formation/**`
- Pre-existing `core-import.test.ts` timeout documented in `deferred-items.md` (out of scope — Phase 1 origin)

## Task Commits

1. **Task 1: Write dm-agent.integration.test.ts** - `41ba44e` (feat)
2. **Task 2: Add coverage thresholds to vitest.config.ts** - `d201cd7` (feat)

## Files Created/Modified

- `packages/core/src/ai/formation/dm-agent.integration.test.ts` — Integration test for DM Agent: seeds real student, 3 test cases (end_turn, tool-use, nonexistent)
- `vitest.config.ts` — Added `thresholds` block inside `coverage` with per-glob targets for handlers and agents
- `.planning/phases/03-integration-ci/deferred-items.md` — Log of out-of-scope pre-existing issue

## Decisions Made

- `vi.mock('@anthropic-ai/sdk')` hoisted before agent import: ESM mock hoisting requires the mock declaration to appear before any import that would load the SDK
- `vi.mock('../../ai/embeddings.js')` returns `null`: the DM Agent calls `getEmbedding()` inside `search_course_content` tool handler — returning null lets the real `searchFormationKnowledge` run against DB with a null embedding (BM25 only path)
- Per-glob thresholds over global: more targeted — only enforces coverage on the production logic paths (handlers and agents), not utility/config files
- Thresholds set at 70/65/70/70 for handlers, 70/60/70/70 for agents: matches current coverage levels to set a floor, not force increases

## Deviations from Plan

None — plan executed exactly as written.

The pre-existing `core-import.test.ts` timeout failure is logged as a deferred item. It was present before Plan 03 started (introduced in Phase 01-foundation commit `a02adab`) and is not caused by any changes in this plan.

## Issues Encountered

- `pnpm test:coverage` exits code 1 due to pre-existing `core-import.test.ts` timeout (not threshold failures). Thresholds themselves pass — no threshold-specific failure lines in output. Logged to `deferred-items.md`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `vitest.config.ts` complete with integration projects + coverage thresholds — ready for CI plan (03-04)
- DM Agent integration test ready to run against Supabase local: `supabase start && pnpm test:integration --project core-integration`
- Deferred: fix `core-import.test.ts` timeout before considering `pnpm test:coverage` as a green signal

---
*Phase: 03-integration-ci*
*Completed: 2026-03-25*
