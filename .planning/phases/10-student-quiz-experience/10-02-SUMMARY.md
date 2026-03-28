---
phase: 10-student-quiz-experience
plan: 02
subsystem: handlers
tags: [discord.js, quiz, button-handlers, dm-handler, typescript, per-user-lock]

# Dependency graph
requires:
  - phase: 10-01
    provides: quiz-flow.ts (sendQuestion, advanceOrComplete), quiz-eval.ts (evaluateOpenAnswer), @assistme/core DB functions
provides:
  - handleQuizStart — Начать button handler (quiz_start_ prefix)
  - handleQuizAnswer — QCM/VF answer button handler (quiz_answer_ prefix)
  - handleQuizDm — DM text handler for open answers and resume
  - setupHandlers — wires interactionCreate + messageCreate into bot client
affects: [10-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "deferReply({ ephemeral: true }) before any DB call in handleQuizStart — prevents Discord interaction timeout"
    - "deferUpdate() before any DB call in handleQuizAnswer — prevents 'interaction failed', also disables buttons visually"
    - "Per-user lock via chained Promise map — serializes concurrent DM messages, same pattern as bot-discord dm-handler.ts"
    - "SendableChannel cast for message.channel — PartialGroupDMChannel lacks .send(), must cast to exclude it"
    - "registerButton(prefix, handler) Map pattern — same as bot-discord button-handler.ts"

key-files:
  created:
    - packages/bot-discord-quiz/src/handlers/quiz-start.ts
    - packages/bot-discord-quiz/src/handlers/quiz-answer.ts
    - packages/bot-discord-quiz/src/handlers/quiz-dm.ts
    - packages/bot-discord-quiz/src/handlers/index.ts
  modified:
    - packages/bot-discord-quiz/src/index.ts

key-decisions:
  - "handleQuizStart defers with ephemeral:true — startup confirmation is private, prevents other students seeing 'Quiz started!' in channel"
  - "handleQuizAnswer uses deferUpdate (not deferReply) — updates the original message (removes buttons) rather than adding a new reply"
  - "SendableChannel cast in quiz-dm.ts — message.channel type is too broad for TypeScript strict mode; cast matches quiz-flow.ts pattern from Plan 01"
  - "awaitingOpenAnswer Map tracks userId->questionId for open-answer state — volatile but correct for single-process Node.js"
  - "Per-user lock chains Promise.resolve() -> processQuizDm() — handles rapid DM sends without race conditions on session state"

patterns-established:
  - "Handler isolation: all 3 handlers import from @assistme/core and local utils only — zero @assistme/bot-discord dependency"
  - "Test export pattern: _clearStateForTesting() and _getAwaitingOpenAnswer() exported for unit test access, underscore prefix signals internal use"

requirements-completed: [QUIZ-01, QUIZ-04, QUIZ-05, QUIZ-07, QUIZ-08]

# Metrics
duration: 10min
completed: 2026-03-28
---

# Phase 10 Plan 02: Quiz Interaction Handlers Summary

**Complete quiz interaction handler layer: Начать button, QCM/VF answer buttons, DM text (open answers + resume), all wired into bot entry point via setupHandlers**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-28T05:39:00Z
- **Completed:** 2026-03-28T05:49:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `handleQuizStart` — handles all 4 session statuses: not_started (start quiz, open DM, send first question), in_progress (resume with D-15 recap), completed (QUIZ-08 one-shot enforcement), expired_incomplete (graceful expiry message)
- Created `handleQuizAnswer` — defers update immediately, exact match correctness for mcq/true_false (EVAL-01/02), disables buttons via editReply({components:[]}), advances quiz via advanceOrComplete
- Created `handleQuizDm` — per-user lock for concurrency safety, open-answer path with AI evaluation (evaluateOpenAnswer), button-question text guard (Russian message), resume path for returning students
- Created `handlers/index.ts` — registerButton Map pattern, interactionCreate with isButton guard, messageCreate with DM-only guard (message.guild !== null check)
- Modified `index.ts` — added GatewayIntentBits.GuildMembers, import + call of setupHandlers(client) in ready callback

## Task Commits

1. **Task 1: Create quiz-start and quiz-answer button handlers** - `3dcd876` (feat)
2. **Task 2: Create quiz-dm handler, wire handlers/index.ts, update entry point** - `81c9b20` (feat)

## Files Created/Modified

- `packages/bot-discord-quiz/src/handlers/quiz-start.ts` - Начать button handler with 4-status state machine
- `packages/bot-discord-quiz/src/handlers/quiz-answer.ts` - QCM/VF answer button handler
- `packages/bot-discord-quiz/src/handlers/quiz-dm.ts` - DM text handler with per-user lock, open-answer flow, resume
- `packages/bot-discord-quiz/src/handlers/index.ts` - setupHandlers wiring both event listeners
- `packages/bot-discord-quiz/src/index.ts` - GuildMembers intent added, setupHandlers called in ready callback

## Decisions Made

- `handleQuizStart` uses `deferReply({ ephemeral: true })` — startup confirmation is private, not visible to other students
- `handleQuizAnswer` uses `deferUpdate()` — updates original message (visual button disable) rather than creating new reply
- `SendableChannel` cast in quiz-dm.ts — matches the established pattern from Plan 01's quiz-flow.ts
- `awaitingOpenAnswer` Map keyed by userId -> questionId — volatile in-memory state; correct for single-process bot
- Per-user lock uses chained Promise map — serializes rapid DM sends without blocking the event loop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SendableChannel cast for message.channel in quiz-dm.ts**
- **Found during:** Task 2 (typecheck after creating quiz-dm.ts)
- **Issue:** `message.channel` is typed as `TextBasedChannel` which includes `PartialGroupDMChannel` — this type has no `.send()` method, causing TS2339 errors at lines 86 and 92
- **Fix:** Defined local `SendableChannel = DMChannel | TextChannel | NewsChannel | ThreadChannel` type (matches Plan 01's quiz-flow.ts) and cast `message.channel` to it before calling `.send()`
- **Files modified:** packages/bot-discord-quiz/src/handlers/quiz-dm.ts
- **Verification:** pnpm typecheck exits 0
- **Committed in:** 81c9b20

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** TypeScript strict mode incompatibility — same root cause as Plan 01 deviation. No scope creep.

## Known Stubs

None — all handler logic is fully implemented.

## Next Phase Readiness

- Bot can now receive and process all quiz interactions end-to-end
- `setupHandlers` is the single entry point — easy to test by injecting a mock Client
- `_clearStateForTesting()` exported from quiz-dm.ts for unit test isolation
- Plan 03 (result notifications / admin digest) can build on the completed session state set by advanceOrComplete

## Self-Check: PASSED

- FOUND: packages/bot-discord-quiz/src/handlers/quiz-start.ts
- FOUND: packages/bot-discord-quiz/src/handlers/quiz-answer.ts
- FOUND: packages/bot-discord-quiz/src/handlers/quiz-dm.ts
- FOUND: packages/bot-discord-quiz/src/handlers/index.ts
- FOUND: commit 3dcd876 (feat(10-02): create quiz-start and quiz-answer button handlers)
- FOUND: commit 81c9b20 (feat(10-02): create quiz-dm handler, wire handlers/index.ts, update entry point)

---
*Phase: 10-student-quiz-experience*
*Completed: 2026-03-28*
