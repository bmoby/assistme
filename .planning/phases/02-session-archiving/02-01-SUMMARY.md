---
phase: 02-session-archiving
plan: 01
subsystem: database
tags: [supabase, exercise-status, bulk-update, archiving]

# Dependency graph
requires:
  - phase: 01-remove-ai-auto-review
    provides: clean exercise flow without AI auto-review
provides:
  - ExerciseStatus with 'archived' value
  - archiveExercisesBySession() bulk archive function
  - getExerciseSummary() excludes archived from counts
  - getPendingExercises() explicitly excludes archived
affects: [02-session-archiving plan 02, bot-discord slash command for archiving]

# Tech tracking
tech-stack:
  added: []
  patterns: [session-number-to-uuid resolution pattern, archivable-statuses constant array]

key-files:
  created:
    - packages/core/src/db/formation/exercises.test.ts
  modified:
    - packages/core/src/types/index.ts
    - packages/core/src/db/formation/exercises.ts

key-decisions:
  - "ARCHIVABLE_STATUSES as module-level constant array for reuse and clarity"
  - "Belt-and-suspenders .neq on getPendingExercises even though .eq('submitted') already excludes archived"
  - "Count via select('id', {count: 'exact'}) before update to return accurate archived count"

patterns-established:
  - "Session number to UUID resolution: query sessions table with .maybeSingle() before operating on exercises"
  - "Status exclusion filter: .neq('status', 'archived') on aggregate queries"

requirements-completed: [ARCH-01, ARCH-03, ARCH-04]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 02 Plan 01: Exercise Archive Data Layer Summary

**Added 'archived' to ExerciseStatus type union, created archiveExercisesBySession() bulk-update function, and updated summary/pending queries to exclude archived exercises**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T06:29:10Z
- **Completed:** 2026-04-01T06:34:36Z
- **Tasks:** 2
- **Files modified:** 3 (2 production + 1 test)

## Accomplishments
- ExerciseStatus type extended with 'archived' status, backward-compatible with existing ai_reviewed/reviewed statuses
- archiveExercisesBySession() resolves session UUID from session_number, bulk-updates matching exercises in submitted/approved/revision_needed statuses, returns count
- getExerciseSummary() now excludes archived exercises from total, pending, approved, and revision_needed counts
- getPendingExercises() has explicit .neq('status', 'archived') safety filter
- Full barrel export chain verified: exercises.ts -> formation/index.ts -> db/index.ts -> core/src/index.ts
- 8 unit tests covering archiveExercisesBySession (5 tests) and getExerciseSummary (3 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `2aa6af8` (test)
2. **Task 1 GREEN: Implementation** - `320b9c0` (feat)

_Note: Task 2 changes (neq filters) were implemented as part of Task 1 GREEN phase since the TDD tests required them._

## Files Created/Modified
- `packages/core/src/types/index.ts` - Added 'archived' to ExerciseStatus union type
- `packages/core/src/db/formation/exercises.ts` - Added archiveExercisesBySession(), updated getExerciseSummary() and getPendingExercises() with .neq filters
- `packages/core/src/db/formation/exercises.test.ts` - 8 unit tests for archiveExercisesBySession and getExerciseSummary

## Decisions Made
- Used ARCHIVABLE_STATUSES as a module-level constant array for reuse and clarity
- Added belt-and-suspenders .neq('status', 'archived') to getPendingExercises even though .eq('status', 'submitted') already excludes archived -- explicit safety per plan D-11
- Used select('id', {count: 'exact'}) + .in('status', ARCHIVABLE_STATUSES) to get count before bulk update

## Deviations from Plan

None - plan executed exactly as written. Task 2 changes were folded into Task 1 implementation because the TDD tests already required the .neq filter behavior.

## Issues Encountered
- Pre-existing typecheck errors in bot-discord-quiz package (mockBuildQuestionEmbed, mockBuildOpenQuestionEmbed) -- unrelated to this plan, logged to deferred-items.md

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Data layer complete: archiveExercisesBySession() is importable from @assistme/core
- Ready for Plan 02: slash command /archive-session in bot-discord, digest notifications, cron integration
- No blockers

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 02-session-archiving*
*Completed: 2026-04-01*
