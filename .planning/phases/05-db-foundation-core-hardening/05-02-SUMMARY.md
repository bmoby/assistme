---
phase: 05-db-foundation-core-hardening
plan: 02
subsystem: testing
tags: [vitest, integration-tests, supabase-local, postgresql, exercises, partial-unique-index]

# Dependency graph
requires:
  - phase: 05-01
    provides: Partial unique index uq_student_exercise_active, atomic session_id in submitExercise, getExerciseByStudentAndSession, fixed getPendingExercisesBySession
provides:
  - Integration tests proving DB constraints work against real Supabase local instance
  - Test coverage for 23505 duplicate rejection, atomic session_id, lookup functions, status filtering
affects: [phase-06, phase-07, CI pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [integration-test-fixture-management-with-FK-cleanup-order]

key-files:
  created:
    - packages/core/src/db/formation/exercises.integration.test.ts
  modified: []

key-decisions:
  - "Use DB-generated UUIDs for student fixtures (not string-prefixed IDs) because students.id is a UUID column"
  - "Clean up exercises by student_id exact match (not prefix like) because student_id is UUID FK"
  - "Verify unique index via 23505 error behavior instead of querying pg_indexes (Supabase JS cannot query system catalogs)"

patterns-established:
  - "FK-ordered cleanup in afterAll: delete child rows first, then parent rows"
  - "Use adminDb direct inserts for approved/non-standard status fixtures that bypass function validation"

requirements-completed: [SUB-01, SUB-03]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 05 Plan 02: DB Integration Tests Summary

**6 integration tests proving exercise submission hardening (23505 duplicate rejection, atomic session_id, lookup functions) against real Supabase local**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T10:11:54Z
- **Completed:** 2026-03-25T10:16:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- 6 integration tests covering all Plan 01 DB changes against real Supabase local
- Proven: partial unique index blocks duplicate (student_id, session_id) active submissions with 23505 error
- Proven: submitExercise stores session_id atomically in INSERT (read-back verification from DB)
- Proven: getExerciseByStudentAndSession returns correct exercise or null
- Proven: getPendingExercisesBySession filters by session number and excludes non-pending statuses

## Task Commits

Each task was committed atomically:

1. **Task 1: Create exercises.integration.test.ts with DB-level verification** - `5c72390` (test)

## Files Created/Modified
- `packages/core/src/db/formation/exercises.integration.test.ts` - 6 integration tests for exercise submission hardening

## Decisions Made
- Used DB-generated UUIDs for test students (students.id is UUID column, cannot use prefixed strings)
- Exercise cleanup uses exact student_id match instead of prefix-based `like` (UUID columns)
- Verified unique index existence indirectly via 23505 duplicate rejection test (Supabase JS client cannot query pg_indexes system catalog)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed student ID format for UUID column**
- **Found during:** Task 1 (RED phase)
- **Issue:** Plan suggested using `${TEST_RUN_ID}-student-1` as student IDs, but students.id is a PostgreSQL UUID column that rejects non-UUID strings
- **Fix:** Let DB generate UUIDs via `adminDb.from('students').insert(...).select('id').single()` and capture returned IDs
- **Files modified:** packages/core/src/db/formation/exercises.integration.test.ts
- **Verification:** All 20 integration tests pass (6 new + 14 existing)
- **Committed in:** 5c72390

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary fix for test correctness with UUID columns. No scope creep.

## Issues Encountered
- Transient 502 from Supabase during `db reset` container restart -- handled by existing globalSetup.ts retry logic (supabase status check)

## User Setup Required
None - no external service configuration required. Tests run against local Supabase instance started by globalSetup.ts.

## Known Stubs
None - all tests are fully implemented with real DB queries, no placeholder data.

## Next Phase Readiness
- All Plan 01 DB changes are now proven with integration tests
- CI pipeline can run these tests via `pnpm vitest run --project core-integration`
- Phase 05 complete: DB foundation hardened with both migration and tests

## Self-Check: PASSED

All created files verified on disk. Commit hash 5c72390 confirmed in git log.

---
*Phase: 05-db-foundation-core-hardening*
*Completed: 2026-03-25*
