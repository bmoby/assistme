---
phase: 10-student-quiz-experience
plan: 03
subsystem: testing
tags: [vitest, discord.js, quiz, unit-tests, vi.mock, vi.hoisted, typescript]

# Dependency graph
requires:
  - phase: 10-01
    provides: quiz-messages.ts, quiz-eval.ts, quiz-flow.ts utilities
  - phase: 10-02
    provides: quiz-start.ts, quiz-answer.ts, quiz-dm.ts handlers

provides:
  - quiz-messages.test.ts — 21 unit tests for all 5 Discord embed/button/feedback builders
  - quiz-eval.test.ts — 8 unit tests for AI evaluation wrapper (model, JSON parse, fallback)
  - quiz-start.test.ts — 7 unit tests for Начать button handler (QUIZ-01, QUIZ-08, resume)
  - quiz-answer.test.ts — 9 unit tests for QCM/VF answer handler (EVAL-01/02, QUIZ-05, button disable)
  - quiz-dm.test.ts — 11 unit tests for DM handler (QUIZ-04/07, EVAL-03/04, D-14, guards)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted for all mock declarations — avoids ReferenceError when vi.mock factory runs before top-level variables initialize"
    - "Class-based mock in vi.mock factory for discord.js builders — captures calls via hoisted spy functions, works with `new` keyword"
    - "invokeAndWait helper for per-user lock drain — multiple Promise.resolve() + setTimeout(0) flushes fire-and-forget lock chain"

key-files:
  created:
    - packages/bot-discord-quiz/src/utils/quiz-messages.test.ts
    - packages/bot-discord-quiz/src/utils/quiz-eval.test.ts
    - packages/bot-discord-quiz/src/handlers/quiz-start.test.ts
    - packages/bot-discord-quiz/src/handlers/quiz-answer.test.ts
    - packages/bot-discord-quiz/src/handlers/quiz-dm.test.ts
  modified: []

key-decisions:
  - "Class-based mocks for discord.js builders instead of vi.fn().mockImplementation() — the latter returns a function, not a constructor, causing 'is not a constructor' TypeError with new EmbedBuilder()"
  - "invokeAndWait drains microtasks via 5x Promise.resolve() + setTimeout(0) — quiz-dm.ts handleQuizDm uses fire-and-forget lock (void currentLock) so await handleQuizDm() returns before processQuizDm completes"
  - "Test helpers _clearStateForTesting/_getAwaitingOpenAnswer exported from quiz-dm.ts used directly — no workarounds needed"

patterns-established:
  - "Quiz bot test isolation: vi.mock('@assistme/core') stubs all DB + AI functions, vi.mock('../utils/quiz-flow.js') stubs flow functions — zero external service dependency"
  - "Fire-and-forget async test drain: for lock-based handlers, use invokeAndWait() with microtask flush before asserting mocks"

requirements-completed: [QUIZ-01, QUIZ-02, QUIZ-03, QUIZ-04, QUIZ-05, QUIZ-06, QUIZ-07, QUIZ-08, EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 10 Plan 03: Unit Test Suite Summary

**56 unit tests across 5 files verifying all 14 Phase 10 requirements (QUIZ-01–08, EVAL-01–06) for the quiz bot interaction layer — zero external service dependencies**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T05:52:00Z
- **Completed:** 2026-03-28T06:00:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `quiz-messages.test.ts` (21 tests): all 5 pure builders tested — embed title/footer/type labels, MCQ row customId sorting, true/false button customIds, open question field, feedback score header, truncation at 2000 chars, missing answer "пропущен"
- Created `quiz-eval.test.ts` (8 tests): evaluateOpenAnswer tested for model:'sonnet' assertion, correct/incorrect JSON parse, malformed JSON fallback (substring match), semantic system prompt "семантически", prompt content inclusion
- Created `quiz-start.test.ts` (7 tests): QUIZ-01 start path + ephemeral defer, QUIZ-08 completed/expired rejection, resume in_progress recap + sendQuestion, not-found, no-questions guards
- Created `quiz-answer.test.ts` (9 tests): EVAL-01/02 exact match correctness, QUIZ-05 advance, button disable via editReply({components:[]}), inactive session guards, hyphenated sessionId parsing
- Created `quiz-dm.test.ts` (11 tests): QUIZ-04 open answer accepted, EVAL-03/04 AI eval called and stored, D-14 single-step (no intermediate confirm), QUIZ-07 resume with "остановились", QUIZ-06 advanceOrComplete called, D-16 session always checked, button guard, not-a-student/no-session/not_started guards

## Task Commits

1. **Task 1: Unit tests for pure utility functions (quiz-messages + quiz-eval)** - `b1c75d7` (test)
2. **Task 2: Unit tests for handler files (quiz-start, quiz-answer, quiz-dm)** - `5e05620` (test)

## Files Created/Modified

- `packages/bot-discord-quiz/src/utils/quiz-messages.test.ts` - 21 tests for 5 Discord embed/row/feedback builders
- `packages/bot-discord-quiz/src/utils/quiz-eval.test.ts` - 8 tests for AI evaluation wrapper
- `packages/bot-discord-quiz/src/handlers/quiz-start.test.ts` - 7 tests for Начать button handler
- `packages/bot-discord-quiz/src/handlers/quiz-answer.test.ts` - 9 tests for QCM/VF answer handler
- `packages/bot-discord-quiz/src/handlers/quiz-dm.test.ts` - 11 tests for DM text handler

## Decisions Made

- Class-based mocks for discord.js EmbedBuilder/ButtonBuilder/ActionRowBuilder — `vi.fn().mockImplementation(...)` produces plain functions, not constructors; `new EmbedBuilder()` throws "is not a constructor" at runtime. Class syntax in vi.mock factory resolves this.
- `invokeAndWait` helper drains the per-user lock microtask chain — `handleQuizDm` internally does `void currentLock` (fire-and-forget), so `await handleQuizDm()` returns immediately before `processQuizDm` runs. Multiple `await Promise.resolve()` + `setTimeout(0)` flushes the promise chain correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed discord.js mock constructors (vi.fn() vs class syntax)**
- **Found during:** Task 1 (quiz-messages.test.ts initial run)
- **Issue:** `vi.mock('discord.js')` factory used `vi.fn().mockImplementation(...)` which produces functions, not constructors — `new EmbedBuilder()` threw "TypeError: EmbedBuilder is not a constructor"
- **Fix:** Changed mock to use real ES6 class syntax inside vi.mock factory, with hoisted spy functions for call capture
- **Files modified:** packages/bot-discord-quiz/src/utils/quiz-messages.test.ts
- **Verification:** All 21 quiz-messages tests pass
- **Committed in:** b1c75d7 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed quiz-eval mock hoisting (mockAskClaude reference error)**
- **Found during:** Task 1 (quiz-eval.test.ts initial run)
- **Issue:** `const mockAskClaude = vi.fn()` at top level was not yet initialized when vi.mock factory ran, causing "Cannot access 'mockAskClaude' before initialization"
- **Fix:** Used vi.hoisted(() => ({ mockAskClaude: vi.fn() })) pattern to initialize mock before vi.mock factory executes
- **Files modified:** packages/bot-discord-quiz/src/utils/quiz-eval.test.ts
- **Verification:** All 8 quiz-eval tests pass
- **Committed in:** b1c75d7 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed async assertion timing for quiz-dm handler (fire-and-forget lock)**
- **Found during:** Task 2 (quiz-dm.test.ts initial run — 9 tests failing)
- **Issue:** `handleQuizDm` uses `void currentLock` fire-and-forget pattern; `await handleQuizDm(msg)` returns before `processQuizDm` resolves, causing all mock assertions to see 0 calls
- **Fix:** Added `invokeAndWait()` helper that awaits 5 microtask rounds + setTimeout(0) to drain the lock promise chain before asserting
- **Files modified:** packages/bot-discord-quiz/src/handlers/quiz-dm.test.ts
- **Verification:** All 11 quiz-dm tests pass
- **Committed in:** 5e05620 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All fixes necessary for correct test execution patterns with Vitest + discord.js mocks. No scope creep — zero new functionality added.

## Issues Encountered

- The `handleQuizDm` fire-and-forget lock architecture is correct for production (avoids blocking the event loop) but requires special test handling — documented via `invokeAndWait` pattern for future test additions.

## Known Stubs

None — all test files are fully wired, no placeholder assertions or TODO items.

## Next Phase Readiness

- All 14 Phase 10 requirements (QUIZ-01–08, EVAL-01–06) have unit test coverage
- `pnpm test:unit` exits 0 with 215 tests passing across all packages
- Phase 10 acceptance gate satisfied: quiz state machine correctness proven without external services

## Self-Check: PASSED

- FOUND: packages/bot-discord-quiz/src/utils/quiz-messages.test.ts
- FOUND: packages/bot-discord-quiz/src/utils/quiz-eval.test.ts
- FOUND: packages/bot-discord-quiz/src/handlers/quiz-start.test.ts
- FOUND: packages/bot-discord-quiz/src/handlers/quiz-answer.test.ts
- FOUND: packages/bot-discord-quiz/src/handlers/quiz-dm.test.ts
- FOUND: commit b1c75d7 (test(10-03): unit tests for quiz-messages and quiz-eval utilities)
- FOUND: commit 5e05620 (test(10-03): unit tests for quiz-start, quiz-answer, quiz-dm handlers)

---
*Phase: 10-student-quiz-experience*
*Completed: 2026-03-28*
