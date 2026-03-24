---
phase: 02-mocks-unit-tests
plan: 05
subsystem: testing
tags: [vitest, fixtures, anthropic, discord, student, session, exercise, faq]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Vitest configured with projects API, smoke tests passing, env isolation

provides:
  - 6 Anthropic JSON fixtures covering tool_use and end_turn scenarios for DM Agent, Tsarag Agent, FAQ Agent
  - 4 domain fixture factories (Student, Session, StudentExercise, FaqEntry) with Partial override support
  - Barrel index with resetAllFixtureSeqs() for test isolation

affects: [02-06, 02-07, 02-08, unit-tests, integration-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Static JSON fixtures for Anthropic API responses (all fields required: id, type, role, content, stop_reason, stop_sequence, model, usage)
    - Module-level seq counter pattern for unique IDs in fixture factories
    - resetSeq() per factory + resetAllFixtureSeqs() barrel aggregator for beforeEach test reset

key-files:
  created:
    - packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-tool-use.json
    - packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-final-text.json
    - packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-submission.json
    - packages/bot-discord/src/__mocks__/fixtures/anthropic/tsarag-read-propose.json
    - packages/bot-discord/src/__mocks__/fixtures/anthropic/faq-agent-match.json
    - packages/bot-discord/src/__mocks__/fixtures/anthropic/faq-agent-low-confidence.json
    - packages/bot-discord/src/__mocks__/fixtures/domain/student.ts
    - packages/bot-discord/src/__mocks__/fixtures/domain/session.ts
    - packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts
    - packages/bot-discord/src/__mocks__/fixtures/domain/faq-entry.ts
    - packages/bot-discord/src/__mocks__/fixtures/domain/index.ts
  modified: []

key-decisions:
  - "JSON arrays for multi-turn agent sequences (dm-agent-submission: 3 responses, tsarag-read-propose: 2 responses) — mimics real sequential Claude API call shapes"
  - "faq-agent fixtures embed JSON string in text field, matching how faq-agent.ts parses Claude output via JSON.parse(response.content[0].text)"
  - "Module-level seq counter (not closure) to allow external resetSeq() without factory re-import"

patterns-established:
  - "Anthropic fixture pattern: every JSON must include stop_reason, stop_sequence (null), model, usage — prevents silent agent loop failures"
  - "Multi-turn fixture pattern: JSON array of response objects, consumed sequentially by mock that pops from array"
  - "Domain factory pattern: createX(overrides?) with Partial<X> spread last for override priority"

requirements-completed: [MOCK-02, MOCK-04]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 02 Plan 05: Claude API Fixtures and Domain Factories Summary

**6 Anthropic JSON fixtures (tool_use + end_turn sequences for DM/Tsarag/FAQ agents) and 4 typed domain factories (Student, Session, StudentExercise, FaqEntry) with seq-based IDs and Partial override support**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-24T14:00:00Z
- **Completed:** 2026-03-24T14:05:56Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created 6 Anthropic message JSON fixtures with complete shapes (stop_reason, usage, content arrays) for deterministic agent test scenarios
- Created 4 domain fixture factories importing types from @assistme/core with module-level seq counters for unique default IDs
- Barrel index exports all 4 factories plus `resetAllFixtureSeqs()` for clean per-test state resets

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Claude API JSON fixtures** - `2fa7636` (feat)
2. **Task 2: Create domain fixture factories** - `2d0f071` (feat)

## Files Created/Modified

- `packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-tool-use.json` - Single tool_use turn fixture (stop_reason: tool_use)
- `packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-final-text.json` - End turn text response (stop_reason: end_turn)
- `packages/bot-discord/src/__mocks__/fixtures/anthropic/dm-agent-submission.json` - 3-element array simulating full create_submission flow
- `packages/bot-discord/src/__mocks__/fixtures/anthropic/tsarag-read-propose.json` - 2-element array: read_students + end_turn with proposedAction
- `packages/bot-discord/src/__mocks__/fixtures/anthropic/faq-agent-match.json` - End turn with confidence 90 JSON payload
- `packages/bot-discord/src/__mocks__/fixtures/anthropic/faq-agent-low-confidence.json` - End turn with confidence 35 JSON payload
- `packages/bot-discord/src/__mocks__/fixtures/domain/student.ts` - createStudent factory, imports Student from @assistme/core
- `packages/bot-discord/src/__mocks__/fixtures/domain/session.ts` - createSession factory, imports Session from @assistme/core
- `packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts` - createExercise factory, imports StudentExercise from @assistme/core
- `packages/bot-discord/src/__mocks__/fixtures/domain/faq-entry.ts` - createFaqEntry factory, imports FaqEntry from @assistme/core
- `packages/bot-discord/src/__mocks__/fixtures/domain/index.ts` - Barrel re-exporting all 4 factories + resetAllFixtureSeqs

## Decisions Made

- JSON arrays for multi-turn agent sequences: dm-agent-submission has 3 responses, tsarag-read-propose has 2. Matches the real sequential shape of Claude API calls in the agent tool-use loop.
- faq-agent-match and faq-agent-low-confidence embed the JSON answer as a text string within the content block, matching how `faq-agent.ts` parses: `JSON.parse(response.content[0].text)`.
- Module-level `let seq = 0` (not closure) allows external `resetSeq()` call without re-importing the module.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `anthropic-mock.ts` (TS2742: inferred type cannot be named without reference to @vitest/spy internal) causes `pnpm typecheck` to fail. This is unrelated to our files and existed before this plan. Domain fixture files have zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fixture infrastructure is complete and ready for unit test authoring in plans 06-07-08
- Domain factories import @assistme/core types — any breaking type changes to Student/Session/StudentExercise/FaqEntry will surface as typecheck errors in fixtures
- resetAllFixtureSeqs() should be called in beforeEach hooks in test files to ensure seq counter isolation between tests

---
*Phase: 02-mocks-unit-tests*
*Completed: 2026-03-24*
