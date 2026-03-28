---
phase: 10-student-quiz-experience
plan: 01
subsystem: database
tags: [discord.js, supabase, quiz, ai-evaluation, discord-buttons, typescript]

# Dependency graph
requires:
  - phase: 09-quiz-creation
    provides: quiz DB tables (quiz_questions, student_quiz_sessions, student_quiz_answers) and @assistme/core exports
provides:
  - getQuestionsByQuiz(quizId) — ordered QuizQuestion[] from Supabase (core DB function)
  - buildQuestionEmbed, buildMcqRow, buildTrueFalseRow, buildOpenQuestionEmbed, buildFeedbackMessage — pure Discord embed/row/feedback builders
  - evaluateOpenAnswer — AI open-answer evaluation wrapper using askClaude sonnet
  - sendQuestion — dispatches embed + optional buttons to a sendable DM/text channel
  - advanceOrComplete — shared quiz progression: either sends next question or calculates final score and sends feedback
affects: [10-02, 10-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Core DB query pattern: getSupabase + TABLE const + .order() + throw on error + (data ?? []) cast"
    - "SendableChannel union type (DMChannel | TextChannel | NewsChannel | ThreadChannel) to exclude PartialGroupDMChannel"
    - "buildFeedbackMessage truncates body at last newline before 2000-char limit"
    - "evaluateOpenAnswer falls back to substring match if JSON.parse fails"

key-files:
  created:
    - packages/core/src/db/quiz/questions.ts
    - packages/bot-discord-quiz/src/utils/quiz-messages.ts
    - packages/bot-discord-quiz/src/utils/quiz-eval.ts
    - packages/bot-discord-quiz/src/utils/quiz-flow.ts
  modified:
    - packages/core/src/db/quiz/index.ts

key-decisions:
  - "Use SendableChannel union type instead of TextBasedChannel — PartialGroupDMChannel lacks .send(), quiz bot only uses DMs and text channels"
  - "advanceOrComplete returns StudentQuizSession | null — null on complete signals handlers that no open-answer state should be set"
  - "quiz-flow.ts delegates entirely to quiz-messages.ts for embed/row building — no direct discord.js builder calls in flow logic"
  - "evaluateOpenAnswer fallback: substring match when JSON parse fails — better than throwing on malformed AI response"

patterns-established:
  - "Pure utility pattern: quiz-messages.ts has zero DB calls, zero side effects — all builders are synchronous except buildFeedbackMessage which is also pure"
  - "Null guard on questions[nextIndex]: logger.error + return null instead of TypeError crash"

requirements-completed: [QUIZ-02, QUIZ-03, QUIZ-06, EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06]

# Metrics
duration: 12min
completed: 2026-03-28
---

# Phase 10 Plan 01: Quiz Foundation Utilities Summary

**Pure quiz utility layer: DB question fetch, Discord embed/button builders, AI open-answer evaluator, and shared quiz progression logic for bot-discord-quiz handlers**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-28T12:30:00Z
- **Completed:** 2026-03-28T12:42:00Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Created `getQuestionsByQuiz(quizId)` in core DB layer — ordered by question_number, follows exact quizzes.ts pattern
- Created 5 pure Discord message builders in quiz-messages.ts — QCM rows (sorted A/B/C/D), V/F rows, open question embeds, feedback with 2000-char truncation
- Created `evaluateOpenAnswer` in quiz-eval.ts — calls askClaude sonnet with Russian semantic-matching system prompt, JSON parse fallback
- Created `sendQuestion` and `advanceOrComplete` in quiz-flow.ts — shared progression logic delegating entirely to quiz-messages.ts builders

## Task Commits

1. **Task 1: Create getQuestionsByQuiz in core + quiz message/eval/flow utilities** - `1340aa3` (feat)

## Files Created/Modified

- `packages/core/src/db/quiz/questions.ts` - getQuestionsByQuiz DB function
- `packages/core/src/db/quiz/index.ts` - Barrel re-export of questions.ts added
- `packages/bot-discord-quiz/src/utils/quiz-messages.ts` - 5 pure embed/row/feedback builders
- `packages/bot-discord-quiz/src/utils/quiz-eval.ts` - AI open-answer evaluation wrapper
- `packages/bot-discord-quiz/src/utils/quiz-flow.ts` - sendQuestion + advanceOrComplete shared flow

## Decisions Made

- Used `SendableChannel` union type (DMChannel | TextChannel | NewsChannel | ThreadChannel) instead of `TextBasedChannel` — `PartialGroupDMChannel` lacks `.send()`, causing TypeScript errors
- `advanceOrComplete` returns `StudentQuizSession | null` — `null` signals quiz completion to callers, avoiding a separate boolean flag
- `evaluateOpenAnswer` substring fallback on JSON.parse failure — better than propagating a crash when Claude returns malformed JSON

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TextBasedChannel type incompatibility**
- **Found during:** Task 1 (quiz-flow.ts creation)
- **Issue:** `TextBasedChannel` includes `PartialGroupDMChannel` which has no `.send()` method, causing 4 TS2339 errors
- **Fix:** Defined `SendableChannel = DMChannel | TextChannel | NewsChannel | ThreadChannel` union type and used it for both `sendQuestion` and `advanceOrComplete` parameters
- **Files modified:** packages/bot-discord-quiz/src/utils/quiz-flow.ts
- **Verification:** pnpm typecheck exits 0
- **Committed in:** 1340aa3

**2. [Rule 1 - Bug] Added null guard for questions[nextIndex]**
- **Found during:** Task 1 (quiz-flow.ts — advanceOrComplete)
- **Issue:** TypeScript strict mode: `questions[nextIndex]` can be `undefined` when array bounds not guaranteed — TS2345 error
- **Fix:** Added explicit null check: logs error and returns null if next question not found
- **Files modified:** packages/bot-discord-quiz/src/utils/quiz-flow.ts
- **Verification:** pnpm typecheck exits 0
- **Committed in:** 1340aa3

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for TypeScript strict mode compliance. No scope creep.

## Issues Encountered

- TypeScript's `TextBasedChannel` union is overly broad for Discord bot DM use cases — scoped to `SendableChannel` union resolves this cleanly

## Next Phase Readiness

- `getQuestionsByQuiz` is available via `@assistme/core` for Plan 02 handlers
- All utils importable from `./utils/` by DM interaction handler (Plan 02) and button interaction handler (Plan 03)
- `advanceOrComplete` return type (`StudentQuizSession | null`) documented — Plan 02 DM handler needs to set `awaitingOpenAnswer` state when return is non-null and next question is `open` type

---
*Phase: 10-student-quiz-experience*
*Completed: 2026-03-28*
