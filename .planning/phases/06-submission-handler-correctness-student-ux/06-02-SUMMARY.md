---
phase: 06-submission-handler-correctness-student-ux
plan: 02
subsystem: testing
tags: [vitest, dm-handler, submission-flow, discord-buttons, unit-tests]

# Dependency graph
requires:
  - phase: 06-01
    provides: "handleSubmissionIntent, executeSubmission, empty-submission-guard, preview-confirm flow"
provides:
  - "Regression protection for all Phase 6 submission handler behaviors via 8 new unit tests"
  - "makeReplyMessageMock helper for button interaction testing"
  - "getSupabase storage mock for uploadFileToStorage path"
affects: [dm-handler.ts, future-submission-changes]

# Tech tracking
tech-stack:
  added: []
  patterns: [makeReplyMessageMock-helper, awaitMessageComponent-mocking, vi.fn-mockResolvedValueOnce-override]

key-files:
  created: []
  modified:
    - packages/bot-discord/src/handlers/dm-handler.test.ts

key-decisions:
  - "Provide student mock in every submission flow test — handleSubmissionIntent calls getStudentByDiscordId before the empty/session checks, so student must exist to reach guards being tested"
  - "Mock getSupabase to return a storage object with upload returning { error: null } — avoids real Supabase calls in tests that reach uploadFileToStorage"
  - "makeReplyMessageMock(customId | null) helper centralizes button interaction mocking — null triggers timeout path"

patterns-established:
  - "makeReplyMessageMock(buttonCustomId) — pass customId string for button click, null for timeout simulation"
  - "Override message.reply mock per-test via (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock)"
  - "Verify button disable via replyMock.__editFn after timeout"

requirements-completed: [SUB-02, SUB-04, UX-01, UX-02, UX-03, UX-04]

# Metrics
duration: 6min
completed: "2026-03-25"
---

# Phase 06 Plan 02: Submission Handler Tests Summary

**8 unit tests covering all Phase 6 submission behaviors: empty guard, session validation, preview embed + Soumettre/Annuler buttons, timeout disable, error cleanup, and re-submission routing.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-25T11:00:39Z
- **Completed:** 2026-03-25T11:06:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added 8 new test cases (Tests 13-20) to `dm-handler.test.ts`, bringing total test count to 20
- Created `makeReplyMessageMock` helper for cleanly simulating Discord button interactions in unit tests
- Added `getSupabase` storage mock so tests reaching `uploadFileToStorage` don't crash on Supabase calls
- All 143 unit tests pass (135 pre-existing + 8 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add unit tests for all Phase 6 submission handler behaviors** - `1c3656a` (test)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `packages/bot-discord/src/handlers/dm-handler.test.ts` — Extended with 8 new Phase 6 test cases, `makeReplyMessageMock` helper, new mock imports (`getSessionByNumber`, `getExercisesByStudent`, `submitExercise`, `resubmitExercise`, `getExerciseByStudentAndSession`, `addAttachment`, `getSupabase`, `deleteAttachmentsByExercise`), and updated `beforeEach` defaults

## Decisions Made

- Need to set student mock in every submission flow test: `handleSubmissionIntent` calls `getStudentByDiscordId` BEFORE the empty/session checks, so without a student, tests exit early with "profile not found" instead of exercising the target behavior
- Mocked `getSupabase` to return a minimal Supabase-shaped object (`storage.from().upload()` returning `{ error: null }`) to avoid runtime crashes in tests that reach `uploadFileToStorage`
- `makeReplyMessageMock(null)` triggers timeout path (awaitMessageComponent rejects), `makeReplyMessageMock(customId)` simulates a button click

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing student mock to tests 13, 14, 15, 17, 18**
- **Found during:** Task 1 — first test run, 7 failures
- **Issue:** Plan template tests for empty submission, invalid session, preview, cancel, and timeout did not set `mockGetStudentByDiscordId`, causing all those tests to fail at the student lookup guard before reaching the code under test
- **Fix:** Added `const student = createStudent({ discord_id: '...' }); mockGetStudentByDiscordId.mockResolvedValue(student);` to each affected test
- **Files modified:** `packages/bot-discord/src/handlers/dm-handler.test.ts`
- **Verification:** All 8 new tests pass after fix

**2. [Rule 1 - Bug] Added getSupabase mock for uploadFileToStorage path**
- **Found during:** Task 1 — tests 16 and 20 (submission confirm + resubmit) would crash at `uploadFileToStorage`
- **Issue:** `uploadFileToStorage` calls `getSupabase().storage.from(...).upload(...)`. Auto-mock returns `undefined` for `getSupabase()`, causing `Cannot read properties of undefined` on `.storage`
- **Fix:** Added `mockGetSupabase.mockReturnValue({ storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }) } } as never)` in `beforeEach`
- **Files modified:** `packages/bot-discord/src/handlers/dm-handler.test.ts`
- **Verification:** Tests 16 and 20 pass, `submitExercise`/`resubmitExercise` assertions verified

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in plan template code that would prevent tests from reaching code under test)
**Impact on plan:** Both fixes necessary for tests to actually test the intended behavior. No scope creep.

## Issues Encountered

None beyond the mock setup issues documented as deviations above.

## Known Stubs

None — tests exercise real implementation paths via mocks.

## Next Phase Readiness

- All Phase 6 behaviors (SUB-02, SUB-04, UX-01, UX-02, UX-03, UX-04) have automated regression protection
- Phase 6 complete: 135 + 8 = 143 tests, all passing
- Ready for Phase 4 (admin UX: thread reuse, AI message update)

## Self-Check: PASSED

- `packages/bot-discord/src/handlers/dm-handler.test.ts` — file exists with 905 lines (verified)
- Commit `1c3656a` — exists in git log (verified)
- `pnpm test:unit -- --run` exits 0 with 143 tests passing (verified)
- 20 total test cases (12 existing + 8 new) — verified via grep

---
*Phase: 06-submission-handler-correctness-student-ux*
*Completed: 2026-03-25*
