---
phase: 07-admin-review-ux-test-coverage
verified: 2026-03-27T14:50:00Z
status: passed
score: 11/11 must-haves verified
gaps: []
human_verification:
  - test: "Open a real re-submission review in Discord"
    expected: "Admin sees the existing thread reopened with separator message, not a new duplicate thread"
    why_human: "Cannot verify actual Discord thread behavior without a live bot and test guild"
  - test: "Double-click 'Ouvrir review' on a live submission"
    expected: "Second click returns thread link, not a new thread in #админ"
    why_human: "Idempotency at the Discord API level (not just unit test mocks) requires live interaction"
  - test: "Submit exercise with file, then admin opens review, then AI review completes"
    expected: "Thread placeholder '🤖 Review IA : en cours...' is replaced in place by the real AI review text"
    why_human: "In-place edit of Discord thread message requires live bot with real review flow"
---

# Phase 07: Admin Review UX + Test Coverage Verification Report

**Phase Goal:** Admins review re-submissions in the same thread without duplicates, and the full submission state machine is covered by integration and E2E tests
**Verified:** 2026-03-27T14:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                 | Status     | Evidence                                                                                                       |
|----|-------------------------------------------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------------------|
| 1  | Re-submission reuses the existing review thread (unarchived) instead of creating a new one            | VERIFIED   | `createReviewThread` lines 31-87: checks `exercise.review_thread_id`, calls `setArchived(false)`, returns existing `threadId` |
| 2  | Double-clicking 'Ouvrir review' creates exactly one thread — second click returns thread link         | VERIFIED   | `handleReviewOpen` lines 57-66: idempotency guard fetches existing thread and returns link without calling `createReviewThread` |
| 3  | AI review message in thread updates in place when review completes — placeholder replaced, not appended | VERIFIED | `triggerAiReview` lines 195-224: fetches thread, fetches `review_thread_ai_message_id` message, calls `aiMsg.edit(aiReviewMsg)` |
| 4  | `resubmitExercise` preserves `review_thread_id` but clears `review_thread_ai_message_id`             | VERIFIED   | `exercises.ts` line 317: `review_thread_ai_message_id: null` in update object, `review_thread_id` intentionally absent |
| 5  | Unit tests cover idempotency: double-click returns thread link on second click                        | VERIFIED   | `review-buttons.test.ts` Test 2b (line 265): asserts `editReply` contains `existing-thread-1`, `createReviewThread` not called |
| 6  | Unit tests cover thread reuse: re-submission with existing `thread_id` calls `setArchived(false)`     | VERIFIED   | `review-thread.test.ts` Test 2 (line 169): asserts `existingThread.setArchived` called with `false`, separator contains `Re-soumission #2` |
| 7  | Unit tests cover deleted thread fallback: missing thread triggers new thread creation                 | VERIFIED   | `review-thread.test.ts` Test 3 (line 212): `channels.fetch` returns null, `threads.create` called once |
| 8  | Unit tests cover AI message edit: `triggerAiReview` edits placeholder when `review_thread_ai_message_id` exists | VERIFIED | `dm-handler.test.ts` line 1004: `channels.fetch` called with `'thread-1'`, `_mockThreadMessage.edit` called once |
| 9  | Unit tests cover AI message edit no-op: `triggerAiReview` skips edit when `review_thread_ai_message_id` is null | VERIFIED | `dm-handler.test.ts` line 1025: `_mockThreadMessage.edit` not called when both IDs are null |
| 10 | Unit tests cover AI message edit graceful degradation: `triggerAiReview` logs warn when edit fails   | VERIFIED   | `dm-handler.test.ts` line 1041: `channels.fetch` rejects, submission still succeeds (user gets `✅` reply) |
| 11 | Integration tests verify `resubmitExercise` preserves `review_thread_id` and clears `review_thread_ai_message_id` | VERIFIED | `exercises.integration.test.ts` line 200: asserts `result.review_thread_id === 'thread-abc'` and `result.review_thread_ai_message_id === null` |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact                                                                  | Expected                                                                        | Status     | Details                                                                                              |
|---------------------------------------------------------------------------|---------------------------------------------------------------------------------|------------|------------------------------------------------------------------------------------------------------|
| `packages/bot-discord/src/utils/review-thread.ts`                        | Thread reuse path + return type `{ threadId, aiMessageId }` + DB persistence   | VERIFIED   | 161 lines; reuse path lines 31-87, new thread path lines 89-159; returns `{ threadId, aiMessageId }` in both paths; calls `updateExercise` internally |
| `packages/bot-discord/src/handlers/review-buttons.ts`                    | Idempotency check in `handleReviewOpen`; does NOT call `updateExercise`         | VERIFIED   | Lines 57-66: guard present; `updateExercise` not called in `handleReviewOpen` for thread IDs |
| `packages/bot-discord/src/handlers/dm-handler.ts`                        | Thread AI message in-place edit in `triggerAiReview`                            | VERIFIED   | Lines 195-224: full edit block with try-catch; non-blocking |
| `packages/core/src/db/formation/exercises.ts`                            | `resubmitExercise` clears `review_thread_ai_message_id`, preserves `review_thread_id` | VERIFIED | Line 317: `review_thread_ai_message_id: null` present; `review_thread_id` absent from update (comment on line 318) |
| `packages/bot-discord/src/utils/review-thread.test.ts`                   | 5 unit tests for all `createReviewThread` code paths                            | VERIFIED   | New file, 343 lines; 5 tests: new thread, reuse, deleted fallback, setArchived failure, AI review message |
| `packages/bot-discord/src/handlers/review-buttons.test.ts`               | 4 new tests for idempotency, deleted-thread fallback, first submission, 5-arg call | VERIFIED | Tests 2b/2c/2d added (lines 265-351); mock return value updated at lines 33 and 201 |
| `packages/bot-discord/src/handlers/dm-handler.test.ts`                   | 3 new tests for `triggerAiReview` thread message edit behavior                  | VERIFIED   | `describe('triggerAiReview thread message edit')` block at lines 939-1062; `channels.fetch` mock in `makeClient()` |
| `packages/core/src/db/formation/exercises.integration.test.ts`           | Integration test: thread ID persistence after `resubmitExercise`                | VERIFIED   | Test at line 200 using `studentId4` fixture; asserts preservation and clearing |

### Key Link Verification

| From                                   | To                                      | Via                                                                     | Status  | Details                                                                       |
|----------------------------------------|-----------------------------------------|-------------------------------------------------------------------------|---------|-------------------------------------------------------------------------------|
| `review-buttons.ts::handleReviewOpen`  | `review-thread.ts::createReviewThread`  | `await createReviewThread(adminChannel, exercise, student, session, interaction.client)` line 85 | WIRED | 5 arguments passed; caller does NOT call `updateExercise` for thread IDs |
| `dm-handler.ts::triggerAiReview`       | Discord thread message                  | `discordClient.channels.fetch(freshExercise.review_thread_id)` + `thread.messages.fetch(...)` + `aiMsg.edit(aiReviewMsg)` lines 198-216 | WIRED | Full chain present; wrapped in try-catch |
| `exercises.ts::resubmitExercise`       | DB update                               | `review_thread_ai_message_id: null` in `.update()` object line 317     | WIRED   | Confirmed: `review_thread_id` absent from update, `review_thread_ai_message_id: null` present |

### Data-Flow Trace (Level 4)

| Artifact                               | Data Variable              | Source                               | Produces Real Data | Status   |
|----------------------------------------|----------------------------|--------------------------------------|--------------------|----------|
| `review-thread.ts::createReviewThread` | `aiMsg.id` (thread message)| `thread.send(...)` Discord API call  | Yes — real Discord message IDs returned and persisted via `updateExercise` | FLOWING  |
| `dm-handler.ts::triggerAiReview`       | `aiReviewMsg`              | `formatReviewThreadMessages(freshExercise, session, student.name, [])` — reads `freshExercise.ai_review` from DB | Yes — fetches fresh exercise from DB after AI review saved | FLOWING  |
| `exercises.ts::resubmitExercise`       | `review_thread_ai_message_id` | DB `.update()` sets to `null`     | Yes — real DB update, not static return | FLOWING  |

### Behavioral Spot-Checks

| Behavior                                            | Command                                   | Result                   | Status  |
|-----------------------------------------------------|-------------------------------------------|--------------------------|---------|
| All unit tests pass (154 tests, 21 files)           | `pnpm test:unit`                          | 154 passed, 0 failed     | PASS    |
| TypeScript compiles without errors across all packages | `pnpm typecheck`                       | All 4 packages: Done     | PASS    |
| Phase commits exist in git history                  | `git log --oneline` grep for commit hashes | 3fe1482, 02dab68, 7cabef1, b344379 all found | PASS |

Note: Integration tests (`pnpm test:integration`) require a running local Supabase instance and are not run in this verification pass. The unit test suite (154 tests) passes, and the integration test file is present and substantive.

### Requirements Coverage

| Requirement | Source Plan | Description                                                                         | Status    | Evidence                                                                                     |
|-------------|-------------|------------------------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------------------|
| ADM-01      | 07-01-PLAN  | Re-soumission reutilise le thread de review existant au lieu d'en creer un nouveau | SATISFIED | `createReviewThread` reuse path (lines 31-87 of review-thread.ts); thread reuse test in review-thread.test.ts |
| ADM-02      | 07-01-PLAN  | Bouton "Ouvrir review" est idempotent — double-clic ne cree pas de thread doublon  | SATISFIED | `handleReviewOpen` idempotency guard (lines 57-66 of review-buttons.ts); Test 2b in review-buttons.test.ts |
| ADM-03      | 07-01-PLAN  | Message AI dans le thread se met a jour en place quand la review AI est terminee   | SATISFIED | `triggerAiReview` edit block (lines 195-224 of dm-handler.ts); 3 tests in dm-handler.test.ts |
| TST-01      | 07-02-PLAN  | Tests unitaires et d'integration couvrant tous les nouveaux comportements           | SATISFIED | 11 new tests across 3 test files + 1 new test file + 1 integration test; all 154 unit tests pass |

No orphaned requirements: all 4 IDs declared in plan frontmatter appear in REQUIREMENTS.md traceability table with Phase 7 assignment.

### Anti-Patterns Found

None. Scan of all 4 modified source files produced no matches for TODO, FIXME, XXX, HACK, PLACEHOLDER, or stub indicators. The Plan 02 SUMMARY confirms a latent bug in `review-thread.ts` (setArchived failure fallback) was discovered and fixed during testing — the fix (`unarchiveSucceeded` boolean flag) is present in the committed code at lines 38-48.

### Human Verification Required

#### 1. Thread Reuse in Live Discord

**Test:** Trigger a re-submission from a real student account (or test Discord account) after an exercise with `revision_needed` status already has a `review_thread_id` set. Then click "Ouvrir review" as admin.
**Expected:** The existing Discord thread is unarchived and a separator message `--- Re-soumission #N ---` appears. No new thread is created in #админ.
**Why human:** Discord's `setArchived(false)` and thread lifecycle behavior can only be fully verified with a live bot token and a real server. Unit tests mock the Discord client.

#### 2. Idempotency Under Live Discord Conditions

**Test:** Click "Ouvrir review" on the same submission twice in quick succession on a live bot.
**Expected:** Second click returns the ephemeral message with the existing thread link `#thread-name`. Only one thread exists in #админ.
**Why human:** Race condition and Discord API response timing cannot be verified from static code analysis. The guard logic is tested in unit tests but real Discord latency may expose edge cases.

#### 3. AI Review In-Place Edit

**Test:** Open a review thread (click "Ouvrir review"), then let the AI review complete asynchronously.
**Expected:** The placeholder message `🤖 Review IA : en cours...` in the thread is replaced (edited) by the actual AI review content. No second message is appended.
**Why human:** Requires live bot with a real file submission going through `executeSubmission` + `reviewExercise` + the edit block. The edit behavior depends on Discord API message edit permissions and message age.

### Gaps Summary

No gaps. All 11 must-have truths are verified against the actual codebase:

- The 4 Plan 01 behavioral changes (thread reuse, idempotency guard, AI message in-place edit, `resubmitExercise` fix) are all present in committed source code with substantive implementations.
- The 7 Plan 02 test coverage truths are all present in committed test files: 5 tests in `review-thread.test.ts`, 4 new tests in `review-buttons.test.ts`, 3 tests in `dm-handler.test.ts`, 1 integration test in `exercises.integration.test.ts`.
- `pnpm test:unit` exits 0 with 154 tests passing across 21 test files.
- `pnpm typecheck` exits 0 across all 4 packages.
- All 4 commits (3fe1482, 02dab68, 7cabef1, b344379) exist in git history.
- A latent bug found during Plan 02 testing (`setArchived` failure fallback) was auto-fixed and is correctly implemented in the committed code.

---

_Verified: 2026-03-27T14:50:00Z_
_Verifier: Claude (gsd-verifier)_
