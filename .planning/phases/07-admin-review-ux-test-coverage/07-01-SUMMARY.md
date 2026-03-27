---
phase: 07-admin-review-ux-test-coverage
plan: 01
subsystem: discord
tags: [discord.js, thread-reuse, idempotency, ai-review, supabase]

requires:
  - phase: 06-submission-handler-correctness
    provides: "student exercise submission flow, review_thread_id + review_thread_ai_message_id columns in DB"

provides:
  - "Thread reuse path in createReviewThread (unarchive + separator on re-submission)"
  - "Idempotency guard in handleReviewOpen (no duplicate threads on double-click)"
  - "AI message in-place edit in triggerAiReview (placeholder replaced by real review)"
  - "resubmitExercise clears review_thread_ai_message_id while preserving review_thread_id"

affects:
  - 07-admin-review-ux-test-coverage-plan-02

tech-stack:
  added: []
  patterns:
    - "createReviewThread owns all DB persistence for review_thread_id + review_thread_ai_message_id — callers must not call updateExercise for these IDs"
    - "channels.fetch wrapped in .catch(() => null) to handle deleted threads (DiscordAPIError, not null)"
    - "Thread AI message edit is non-blocking: wrapped in try-catch, logged at warn level on failure"

key-files:
  created: []
  modified:
    - packages/bot-discord/src/utils/review-thread.ts
    - packages/bot-discord/src/handlers/review-buttons.ts
    - packages/bot-discord/src/handlers/dm-handler.ts
    - packages/core/src/db/formation/exercises.ts
    - packages/bot-discord/src/handlers/review-buttons.test.ts

key-decisions:
  - "createReviewThread is single owner of both review_thread_id and review_thread_ai_message_id DB persistence — handleReviewOpen does NOT call updateExercise for thread IDs"
  - "Thread reuse: setArchived(false) failure logs at warn and falls through to new thread creation — avoids silent data loss"
  - "AI message edit uses formatReviewThreadMessages with [] attachments — verified safe because aiReviewMsg is built entirely from exercise.ai_review (format.ts lines 201-230)"
  - "resubmitExercise clears review_thread_ai_message_id but NOT review_thread_id — fresh placeholder gets new ID, thread persists"

patterns-established:
  - "DB ownership pattern: utility function owns its own DB persistence, caller captures return value only"
  - "Idempotency before creation: check existence, return link if found, fall through only if truly absent"

requirements-completed:
  - ADM-01
  - ADM-02
  - ADM-03

duration: 15min
completed: 2026-03-27
---

# Phase 07 Plan 01: Admin Review UX Summary

**Discord review thread reuse, double-click idempotency, and in-place AI message editing — admin never sees duplicate threads or stale placeholders**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T07:20:00Z
- **Completed:** 2026-03-27T07:35:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `createReviewThread` now returns `{ threadId, aiMessageId }` and reuses the existing Discord thread (unarchived) on re-submissions instead of creating a new one
- `handleReviewOpen` has an idempotency guard: double-clicking "Ouvrir review" returns the existing thread link instead of spawning a duplicate
- `triggerAiReview` edits the thread AI message in-place after saving the review — placeholder `en cours...` is replaced by real AI review content
- `resubmitExercise` clears `review_thread_ai_message_id` (so fresh placeholder gets a new ID on re-open) while preserving `review_thread_id` (thread persists across re-submissions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Thread reuse + idempotency** - `3fe1482` (feat)
2. **Task 2: AI message in-place edit + resubmitExercise fix** - `02dab68` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `packages/bot-discord/src/utils/review-thread.ts` - New signature with Client param + return type + thread reuse path + DB persistence ownership
- `packages/bot-discord/src/handlers/review-buttons.ts` - Idempotency guard in handleReviewOpen, pass client to createReviewThread
- `packages/bot-discord/src/handlers/dm-handler.ts` - Add formatReviewThreadMessages import, in-place edit block in triggerAiReview
- `packages/core/src/db/formation/exercises.ts` - Add review_thread_ai_message_id: null to resubmitExercise update object
- `packages/bot-discord/src/handlers/review-buttons.test.ts` - Fix createReviewThread mock return value to match new type

## Decisions Made

- `createReviewThread` is the single owner of DB persistence for both `review_thread_id` and `review_thread_ai_message_id` in all code paths — no caller should call `updateExercise` for these IDs
- Thread reuse: if `setArchived(false)` throws, log at warn and fall through to new thread creation — this handles the edge case where the thread exists in DB but Discord denies unarchiving
- AI message edit uses `formatReviewThreadMessages` with `[]` for attachments — safe because `aiReviewMsg` is built entirely from `exercise.ai_review` (verified in format.ts lines 201-230, attachments only affect `submissionMsg` and `imageUrl`)
- `review_thread_id` is intentionally preserved in `resubmitExercise` — the thread acts as a persistent review history for the exercise

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed createReviewThread mock return type in review-buttons.test.ts**
- **Found during:** Task 1 (after writing new return type)
- **Issue:** Mock at lines 33 and 201 returned `undefined` which TypeScript rejected as not assignable to `{ threadId: string; aiMessageId: string }` — typecheck failed with TS2345
- **Fix:** Updated both mock locations to return `{ threadId: 'thread-1', aiMessageId: 'ai-msg-1' }`
- **Files modified:** packages/bot-discord/src/handlers/review-buttons.test.ts
- **Verification:** pnpm typecheck passes with exit 0
- **Committed in:** 3fe1482 (Task 1 commit, included in same atomic commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test mock blocking typecheck)
**Impact on plan:** Fix was necessary for typecheck to pass. No scope creep.

## Issues Encountered

None beyond the test mock deviation above.

## Known Stubs

None — all modified code paths are wired to real DB operations and real Discord API calls.

## Next Phase Readiness

- Plan 02 (unit tests for the new behavior) is unblocked
- `createReviewThread` return type change may cause test mocks in other test files to need updating — Plan 02 should audit all mocks of this function
- `handleReviewOpen` idempotency check calls `interaction.client.channels.fetch` — ButtonInteractionBuilder currently has no `channels.fetch` mock; tests that exercise the idempotency path need to add it to the builder

## Self-Check: PASSED

- FOUND: packages/bot-discord/src/utils/review-thread.ts
- FOUND: packages/bot-discord/src/handlers/review-buttons.ts
- FOUND: packages/bot-discord/src/handlers/dm-handler.ts
- FOUND: packages/core/src/db/formation/exercises.ts
- FOUND: .planning/phases/07-admin-review-ux-test-coverage/07-01-SUMMARY.md
- FOUND commit: 3fe1482 (Task 1)
- FOUND commit: 02dab68 (Task 2)

---
*Phase: 07-admin-review-ux-test-coverage*
*Completed: 2026-03-27*
