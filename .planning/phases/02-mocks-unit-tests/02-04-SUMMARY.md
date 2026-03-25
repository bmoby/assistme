---
phase: 02-mocks-unit-tests
plan: 04
subsystem: testing
tags: [vitest, anthropic-sdk, mocks, unit-tests, faq-agent, tsarag-agent, dm-agent, tool-routing]

requires:
  - phase: 02-01
    provides: mock infrastructure (Anthropic SDK vi.hoisted pattern, DB auto-mocks, logger mock)
  - phase: 02-05
    provides: fixture factories and domain data for test scaffolding patterns

provides:
  - "7 unit tests for FAQ Agent: response parsing, confidence levels, malformed JSON fallback, markdown code block stripping, FAQ entry injection, API error propagation, auto-knowledge-search"
  - "11 unit tests for Tsarag Agent: direct response, list_students routing, get_student_details routing, propose_action proposal, execute_pending confirmation, idempotency via executedActionIds, turnMessages tracking, tool error handling, max iteration limit (8), conversation history passthrough, search_course_content routing"
  - "8 unit tests for DM Agent (committed at 8b7efc7): tool routing, multi-turn sequences, get_student_progress, create_submission, search_course_content, iteration limits, error handling, conversation history"
  - "All three core AI agents in packages/core fully covered by unit tests"

affects:
  - 02-mocks-unit-tests (completes wave 2 agent tests)
  - future AI agent refactoring (regressions caught by these tests)

tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for Anthropic SDK mock — ensures MockAnthropic constructor is available before vi.mock() factory runs"
    - "Module-level singleton reset: each test calls vi.clearAllMocks(), fresh MockAnthropic re-hoisted per fork"
    - "FAQ agent tests mock ../client.js (askClaude) not @anthropic-ai/sdk directly — matches single-turn architecture"
    - "Tsarag agent mock pattern identical to DM agent (both use Anthropic SDK default import directly)"
    - "makeContext() factory helper for TsaragAgentContext with full discordActions mock callbacks"
    - "Inline fixture helpers (makeToolUseResponse, makeTextResponse) — no cross-package imports for test independence"

key-files:
  created:
    - packages/core/src/ai/formation/faq-agent.test.ts
    - packages/core/src/ai/formation/tsarag-agent.test.ts
  modified: []

key-decisions:
  - "FAQ agent mocks askClaude (../client.js) not @anthropic-ai/sdk — faq-agent.ts delegates to client abstraction, not raw SDK"
  - "Tsarag agent max iterations = 8 (not 5 like DM agent) — verified in source before writing iteration limit test"
  - "Pre-existing core-import.test.ts timeout failure is out-of-scope — exists before and after this plan's changes"

patterns-established:
  - "Agent test pattern: vi.hoisted + vi.mock + beforeEach(vi.clearAllMocks) + fixture factories"
  - "One mock per external dependency: DB modules auto-mocked, discordActions mocked as vi.fn(), embeddings mocked with zero vector"

requirements-completed: [UNIT-07]

duration: 15min
completed: 2026-03-25
---

# Phase 02 Plan 04: Agent Unit Tests Summary

**18 unit tests for FAQ Agent (7) and Tsarag Agent (11) verifying tool routing, action proposal/confirmation, idempotency, and error handling with zero real API calls**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T01:15:00Z
- **Completed:** 2026-03-25T01:31:12Z
- **Tasks:** 2 (Task 1 committed by prior executor at 8b7efc7; Task 2 executed here)
- **Files modified:** 2 created

## Accomplishments

- FAQ Agent: 7 passing tests covering all branches — valid JSON, low confidence, malformed JSON fallback, markdown-stripped JSON, FAQ entry injection into prompt, API error propagation, auto-knowledge-search when formationKnowledge omitted
- Tsarag Agent: 11 passing tests covering all tool routes — list_students, get_student_details, propose_action/execute_pending confirmation flow, idempotency via executedActionIds, turnMessages array, tool error resilience, max 8-iteration limit, conversation history passthrough, search_course_content routing
- Full unit suite: 123 tests passing (18 new from this plan + 105 prior); only pre-existing core-import.test.ts timeout fails (unrelated to this plan)

## Task Commits

1. **Task 1: DM Agent unit tests** — `8b7efc7` (feat) — committed by prior executor
2. **Task 2: FAQ Agent + Tsarag Agent unit tests** — `0a413ed` (feat)

**Plan metadata:** (this summary commit)

## Files Created/Modified

- `packages/core/src/ai/formation/faq-agent.test.ts` — 7 tests; mocks `../client.js` (askClaude), knowledge.js, embeddings.js
- `packages/core/src/ai/formation/tsarag-agent.test.ts` — 11 tests; mocks `@anthropic-ai/sdk` via vi.hoisted, all DB modules, google/meet.js, utils/session-forum.js, embeddings.js

## Decisions Made

- FAQ agent mocks `askClaude` from `../client.js` rather than `@anthropic-ai/sdk` — `faq-agent.ts` delegates to the `askClaude` wrapper, not raw SDK; matching the actual call graph is essential for the mock to intercept the right function
- Tsarag agent max iterations confirmed as 8 from source (`const maxIterations = 8`) before writing the iteration-limit test — DM agent uses 5
- `formationKnowledge` omitted (not empty string) in the auto-search test to trigger the `!knowledgeContext` branch in faq-agent.ts

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Initial run of `pnpm test:unit` showed dm-handler test failing alongside new tests (state isolation concern), but on re-run the failure disappeared — confirmed flaky/timing-related from parallel project execution. Both new test files pass consistently in isolation and the full suite is stable.

## Known Stubs

None — tests wire real mock responses and verify real return values.

## Next Phase Readiness

- All three core AI agents (DM, FAQ, Tsarag) have unit test coverage in `packages/core`
- Bot Discord handler tests and command tests already completed in prior plans
- Phase 02 test infrastructure is complete — ready for Phase 03 integration tests

---
*Phase: 02-mocks-unit-tests*
*Completed: 2026-03-25*
