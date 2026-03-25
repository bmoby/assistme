---
phase: 05-db-foundation-core-hardening
plan: 01
subsystem: database
tags: [postgresql, migration, partial-unique-index, supabase, typescript, exercises]

# Dependency graph
requires:
  - phase: none (first plan in milestone v2.0)
    provides: existing student_exercises table with session_id FK
provides:
  - Partial unique index uq_student_exercise_active preventing duplicate active submissions
  - review_thread_id and review_thread_ai_message_id columns on student_exercises
  - Atomic session_id in submitExercise INSERT (no separate UPDATE)
  - getExerciseByStudentAndSession targeted lookup function
  - Fixed getPendingExercisesBySession using session_id instead of exercise_number
affects: [05-02-PLAN, phase-06, phase-07, bot-discord handlers, admin review UX]

# Tech tracking
tech-stack:
  added: []
  patterns: [partial-unique-index-with-do-block-safety, duplicate-constraint-error-handling-23505]

key-files:
  created:
    - supabase/migrations/017_exercise_submission_v2.sql
  modified:
    - packages/core/src/types/index.ts
    - packages/core/src/db/formation/exercises.ts
    - packages/core/src/ai/formation/dm-agent.ts
    - packages/core/src/ai/formation/dm-agent.test.ts
    - packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts

key-decisions:
  - "DO block with duplicate detection before index creation for safe production migration"
  - "Keep getPendingExercisesBySession(sessionNumber: number) signature to avoid breaking callers, resolve UUID internally"

patterns-established:
  - "Partial unique index with DO-block safety check for production migrations"
  - "Duplicate constraint error code 23505 handling in DB functions"

requirements-completed: [SUB-01, SUB-03]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 05 Plan 01: DB Foundation Summary

**Partial unique index on student_exercises, atomic session_id INSERT, and review_thread columns via migration 017**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T10:02:15Z
- **Completed:** 2026-03-25T10:07:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Migration 017 with partial unique index preventing duplicate active submissions per (student_id, session_id)
- submitExercise now requires session_id atomically in the INSERT, eliminating the two-step INSERT + UPDATE pattern
- getExerciseByStudentAndSession provides a targeted single-row lookup for active submissions
- getPendingExercisesBySession bug fixed: now queries by session_id instead of exercise_number
- review_thread_id and review_thread_ai_message_id columns added for upcoming thread-based review UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 017_exercise_submission_v2.sql** - `c0594de` (feat)
2. **Task 2: Update types, exercises.ts functions, and dm-agent.ts caller** - `b86069b` (feat)

## Files Created/Modified
- `supabase/migrations/017_exercise_submission_v2.sql` - Partial unique index + review thread columns
- `packages/core/src/types/index.ts` - Added review_thread_id and review_thread_ai_message_id to StudentExercise
- `packages/core/src/db/formation/exercises.ts` - session_id in submitExercise, getExerciseByStudentAndSession, fixed getPendingExercisesBySession
- `packages/core/src/ai/formation/dm-agent.ts` - Single submitExercise call with session_id (removed separate UPDATE)
- `packages/core/src/ai/formation/dm-agent.test.ts` - Updated mock fixtures with new fields
- `packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts` - Updated exercise fixture with new fields

## Decisions Made
- DO block with duplicate detection before index creation -- safe for production migration where duplicates may exist
- Keep getPendingExercisesBySession(sessionNumber: number) signature unchanged to avoid breaking callers in review-buttons.ts and review.ts -- resolve session UUID internally via a two-step query

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test fixtures with new StudentExercise fields**
- **Found during:** Task 2 (Step F - typecheck/test run)
- **Issue:** dm-agent.test.ts inline mocks and exercise.ts fixture were missing review_thread_id and review_thread_ai_message_id, causing type mismatches
- **Fix:** Added the two new null fields to all mock StudentExercise objects
- **Files modified:** packages/core/src/ai/formation/dm-agent.test.ts, packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts
- **Verification:** pnpm test:unit passes (135 tests)
- **Committed in:** b86069b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for test correctness after type change. No scope creep.

## Issues Encountered
- Pre-existing typecheck failures in faq-agent.test.ts, tsarag-agent.test.ts, and dm-agent integration test (rootDir issue) -- these are NOT caused by this plan's changes and exist on the base branch. Logged to deferred-items.md. Unit tests pass clean (135/135).

## User Setup Required
None - no external service configuration required. Migration 017 must be applied to Supabase before deploying handler changes from subsequent plans.

## Known Stubs
None - all functions are fully implemented with real DB queries, no placeholder data.

## Next Phase Readiness
- Migration 017 ready to apply with `supabase db push` or via Supabase dashboard
- Core DB functions and types are updated, ready for handler-level changes in Plan 02 and Phase 06
- Partial unique index will enforce submission uniqueness at DB level once applied

## Self-Check: PASSED

All created files verified on disk. Both commit hashes (c0594de, b86069b) confirmed in git log.

---
*Phase: 05-db-foundation-core-hardening*
*Completed: 2026-03-25*
