---
phase: 08-infrastructure
plan: 01
subsystem: database
tags: [supabase, postgresql, quiz, migrations, typescript-types, crud]

# Dependency graph
requires:
  - phase: 05-db-foundation-core-hardening
    provides: students table with UUID primary key referenced by student_quiz_sessions FK
  - phase: 01-foundation
    provides: packages/core DB pattern (getSupabase, logger, TABLE const, error handling)

provides:
  - supabase/migrations/018_quiz_system.sql with 4 quiz tables and 9 indexes
  - Quiz, QuizQuestion, StudentQuizSession, StudentQuizAnswer TypeScript interfaces
  - QuizStatus, QuizQuestionType, StudentQuizSessionStatus union types
  - packages/core/src/db/quiz/ with CRUD for quizzes, sessions, answers
  - closeExpiredQuizSessions() with 48h expiration and partial score calculation
  - All quiz DB functions re-exported from @assistme/core

affects: [09-quiz-creation, 10-student-experience, 11-quiz-notifications, 12-quiz-bot-package]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Quiz DB module follows established formation/ CRUD pattern: const TABLE, getSupabase(), logger error handling, PGRST116 not-found guard"
    - "closeExpiredQuizSessions: loop-per-quiz with partial score = (correctAnswers / totalQuestions) * 100"

key-files:
  created:
    - supabase/migrations/018_quiz_system.sql
    - packages/core/src/db/quiz/quizzes.ts
    - packages/core/src/db/quiz/sessions.ts
    - packages/core/src/db/quiz/answers.ts
    - packages/core/src/db/quiz/index.ts
  modified:
    - packages/core/src/types/index.ts
    - packages/core/src/db/index.ts

key-decisions:
  - "original_txt TEXT column on quizzes provides DATA-06 baseline storage — Supabase Storage deferred to later phase if file sizes warrant it"
  - "closeExpiredQuizSessions operates as loop-per-quiz to keep partial score calculation correct per session"
  - "getQuizBySession returns latest quiz for a session_number (descending created_at) to allow quiz replacement"

patterns-established:
  - "Quiz DB CRUD: follows exact same pattern as packages/core/src/db/formation/students.ts"
  - "Record<string, unknown> for JSONB columns (questions_data, choices, ai_evaluation)"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 08 Plan 01: Infrastructure Summary

**Four quiz tables DDL (018 migration) + TypeScript types + core DB CRUD module with 48h expiration logic**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T10:37:28Z
- **Completed:** 2026-03-27T10:42:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created migration 018 with 4 quiz tables (quizzes, quiz_questions, student_quiz_sessions, student_quiz_answers), all constraints, FK references to students(id), and 9 performance indexes
- Added Quiz, QuizQuestion, StudentQuizSession, StudentQuizAnswer interfaces and 3 union types to packages/core/src/types/index.ts
- Created packages/core/src/db/quiz/ module with 13 CRUD functions following established formation/ patterns, including closeExpiredQuizSessions() that implements D-01 (48h expiration with partial score)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 018 and add quiz types to core** - `1ef70e8` (feat)
2. **Task 2: Create core DB quiz module with CRUD and expiration logic** - `33ca411` (feat)

## Files Created/Modified

- `supabase/migrations/018_quiz_system.sql` - Four quiz tables DDL with CHECK constraints, FK references, and 9 indexes
- `packages/core/src/types/index.ts` - Quiz, QuizQuestion, StudentQuizSession, StudentQuizAnswer interfaces + QuizStatus, QuizQuestionType, StudentQuizSessionStatus types appended
- `packages/core/src/db/quiz/quizzes.ts` - createQuiz, getQuiz, getQuizBySession, getActiveQuizzes, updateQuizStatus
- `packages/core/src/db/quiz/sessions.ts` - createQuizSession, getQuizSession, getSessionsByQuiz, getActiveSessionByStudent, updateQuizSession, closeExpiredQuizSessions
- `packages/core/src/db/quiz/answers.ts` - saveAnswer, getAnswersBySession
- `packages/core/src/db/quiz/index.ts` - Barrel re-export for quizzes, sessions, answers
- `packages/core/src/db/index.ts` - Added `export * from './quiz/index.js'`

## Decisions Made

- `original_txt TEXT` column on quizzes provides DATA-06 baseline storage; Supabase Storage deferred if file sizes require it
- `getQuizBySession` returns the latest quiz for a session number (order by created_at DESC) allowing quiz replacement per session
- `closeExpiredQuizSessions` loops per quiz (not bulk update) to correctly calculate partial score per individual session

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - typecheck and all 154 unit tests passed after both tasks.

## User Setup Required

None - no external service configuration required. Migration 018 must be applied to Supabase before the quiz features can be used (standard migration workflow).

## Next Phase Readiness

- Migration 018 ready to apply via `supabase db push` or Supabase dashboard SQL editor
- All quiz types and DB functions exported from @assistme/core — phase 09 (quiz creation bot package) can import directly
- closeExpiredQuizSessions ready to wire into cron scheduler in phase 09

---
*Phase: 08-infrastructure*
*Completed: 2026-03-27*
