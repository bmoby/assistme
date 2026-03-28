---
phase: 07-admin-review-ux-test-coverage
plan: 02
subsystem: testing
tags: [vitest, discord.js, unit-tests, integration-tests, thread-reuse, triggerAiReview]

requires:
  - phase: 07-admin-review-ux-test-coverage-plan-01
    provides: "Thread reuse path, idempotency guard, AI message in-place edit, resubmitExercise review_thread_id preservation"

provides:
  - "Unit tests for handleReviewOpen idempotency: double-click returns thread link, not duplicate thread"
  - "Unit tests for handleReviewOpen deleted-thread fallback: falls through to new thread creation"
  - "Unit test for createReviewThread new thread: returns { threadId, aiMessageId }, persists to DB"
  - "Unit test for createReviewThread thread reuse: unarchives, sends separator, preserves thread ID"
  - "Unit test for createReviewThread deleted-thread fallback: fetch returns null => new thread"
  - "Unit test for createReviewThread setArchived failure fallback: permission error => new thread"
  - "Unit test for createReviewThread AI review message: sends real aiReviewMsg when ai_review set"
  - "Unit tests for triggerAiReview: edits placeholder, no-op when null, graceful degradation on failure"
  - "Integration test: resubmitExercise preserves review_thread_id, clears review_thread_ai_message_id"

affects: []

tech-stack:
  added: []
  patterns:
    - "triggerAiReview is only reachable via executeSubmission (requires storagePaths.length > 0 from file attachment) — cannot be tested via legacy submissionId path"
    - "Full submission flow test: submissionIntent + makeReplyMessageMock('submission_confirm') + file attachment triggers triggerAiReview"
    - "channels.fetch on interaction.client must be injected per-test when testing idempotency path in handleReviewOpen"

key-files:
  created:
    - packages/bot-discord/src/utils/review-thread.test.ts
  modified:
    - packages/bot-discord/src/handlers/review-buttons.test.ts
    - packages/bot-discord/src/handlers/dm-handler.test.ts
    - packages/core/src/db/formation/exercises.integration.test.ts
    - packages/bot-discord/src/utils/review-thread.ts

key-decisions:
  - "triggerAiReview test approach: must use submissionIntent + file attachment (not submissionId legacy path) because triggerAiReview only fires from executeSubmission when storagePaths.length > 0"
  - "setArchived failure fallback bug fixed in review-thread.ts: try-catch without success flag caused fallthrough to reuse path instead of new thread path (Rule 1 auto-fix)"
  - "channels.fetch injected on interaction.client in review-buttons tests rather than modifying ButtonInteractionBuilder — minimal scope, no builder changes needed"
  - "studentId4 dedicated fixture in integration test avoids mutating studentId2 and breaking getPendingExercisesBySession tests"

patterns-established:
  - "Test private fire-and-forget functions by triggering the full calling flow with correct preconditions"
  - "Use unarchiveSucceeded boolean flag to guard reuse path — prevents silent fallthrough when catch block doesn't re-throw"

requirements-completed:
  - TST-01

duration: 9min
completed: 2026-03-27
---

# Phase 07 Plan 02: Admin Review UX Test Coverage Summary

**11 new tests covering all 4 new code paths from Plan 01: idempotency guard, thread reuse, deleted-thread fallback, and triggerAiReview in-place edit — plus a Rule 1 bug fix in review-thread.ts**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-27T14:29:00Z
- **Completed:** 2026-03-27T14:38:00Z
- **Tasks:** 2
- **Files modified:** 5 (4 test files + 1 source file bug fix)

## Accomplishments

- 4 new unit tests in `review-buttons.test.ts` covering idempotency (thread link returned on 2nd click), deleted-thread fallback (new thread created), first submission (null thread_id), and 5-argument call assertion
- 5 new unit tests in new `review-thread.test.ts` covering new thread creation with DB persistence, thread reuse (unarchive + separator), deleted-thread fallback, setArchived failure fallback, and AI review message sent instead of placeholder
- 3 new unit tests in `dm-handler.test.ts` covering `triggerAiReview` thread message edit (edit path, no-op path, graceful degradation)
- 1 new integration test in `exercises.integration.test.ts` verifying `resubmitExercise` preserves `review_thread_id` and clears `review_thread_ai_message_id`
- Fixed bug in `review-thread.ts` where `setArchived` failure did NOT fall through to new thread creation (Rule 1 auto-fix)

## Task Commits

Each task was committed atomically:

1. **Task 1: review-buttons idempotency tests + review-thread.test.ts** - `7cabef1` (test + fix)
2. **Task 2: dm-handler triggerAiReview tests + exercises integration test** - `b344379` (test)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `packages/bot-discord/src/utils/review-thread.test.ts` - New: 5 tests for createReviewThread all code paths
- `packages/bot-discord/src/handlers/review-buttons.test.ts` - Updated: 4 new tests + 5-arg call assertion
- `packages/bot-discord/src/handlers/dm-handler.test.ts` - Extended: 3 triggerAiReview tests, makeClient with channels.fetch, reviewExercise/getSignedUrl mocks
- `packages/core/src/db/formation/exercises.integration.test.ts` - Extended: studentId4 fixture + resubmit thread ID test
- `packages/bot-discord/src/utils/review-thread.ts` - Bug fix: setArchived failure now correctly falls through to new thread (unarchiveSucceeded flag)

## Decisions Made

- `triggerAiReview` testing approach: use full `submissionIntent` + confirm button + file attachment flow — the legacy `submissionId` path does NOT call `triggerAiReview` (only `executeSubmission` does, and only when `storagePaths.length > 0`)
- `channels.fetch` injected directly onto `interaction.client` per-test rather than modifying `ButtonInteractionBuilder` — minimal invasive approach
- Dedicated `studentId4` fixture for integration test to avoid polluting state used by `getPendingExercisesBySession` tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed setArchived failure fallback in review-thread.ts**
- **Found during:** Task 1 (while writing test 4 for createReviewThread setArchived failure)
- **Issue:** The catch block in the reuse path logged a warning and set a comment "Fall through to new thread creation below", but the code continued executing the reuse path anyway (no success guard). The test for this behavior (setArchived throws => new thread created) failed with "threads.create not called" because the reuse path continued despite the error.
- **Fix:** Added `unarchiveSucceeded` boolean flag, wrapped reuse path in `if (unarchiveSucceeded) {...}` — only continues reuse when unarchive succeeded, falls through to new thread creation otherwise.
- **Files modified:** packages/bot-discord/src/utils/review-thread.ts
- **Verification:** `pnpm test:unit` passes (all 154 tests green)
- **Committed in:** 7cabef1 (Task 1 commit)

**2. [Rule 1 - Bug] triggerAiReview not reachable via submissionId legacy path**
- **Found during:** Task 2 (first triggerAiReview test implementation)
- **Issue:** Plan instructions said to use `mockRunDmAgent.mockResolvedValue({ text: '...', submissionId: 'ex-1' })` to trigger `triggerAiReview`. But after Plan 06, `triggerAiReview` is only called from `executeSubmission` when `storagePaths.length > 0`. The `submissionId` legacy path only calls `notifyAdminChannel`, not `triggerAiReview`. Test verified: `channels.fetch` was called 0 times.
- **Fix:** Changed test approach to use `submissionIntent` + confirm button + file attachment (same pattern as Tests 13-20), which goes through `executeSubmission` and calls `triggerAiReview` with non-empty `storagePaths`.
- **Files modified:** packages/bot-discord/src/handlers/dm-handler.test.ts (test approach only)
- **Verification:** `pnpm test:unit` passes (channels.fetch called with 'thread-1')
- **Committed in:** b344379 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs)
**Impact on plan:** Both fixes necessary for correct behavior and passing tests. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Known Stubs

None — all test files test real code paths, no hardcoded empty values.

## Next Phase Readiness

- Phase 07 complete: all ADM-01/02/03 features from Plan 01 are fully covered by tests
- TST-01 requirement satisfied: idempotency, thread reuse, deleted-thread fallback, AI message edit, thread ID persistence all tested
- `review-thread.ts` setArchived failure fallback is now correctly implemented (was a latent bug since Plan 01)

## Self-Check: PASSED

- FOUND: packages/bot-discord/src/utils/review-thread.test.ts
- FOUND: packages/bot-discord/src/handlers/review-buttons.test.ts
- FOUND: packages/bot-discord/src/handlers/dm-handler.test.ts
- FOUND: packages/core/src/db/formation/exercises.integration.test.ts
- FOUND: packages/bot-discord/src/utils/review-thread.ts
- FOUND commit: 7cabef1 (Task 1)
- FOUND commit: b344379 (Task 2)

---
*Phase: 07-admin-review-ux-test-coverage*
*Completed: 2026-03-27*
