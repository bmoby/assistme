# Phase 7: Admin Review UX + Test Coverage - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins review exercises without thread duplication — re-submissions reuse the existing review thread (unarchived), "Ouvrir review" button is idempotent (double-click = one thread), AI review message updates in place when review completes, and all new behaviors are covered by unit + integration tests. Scope: `review-buttons.ts`, `review-thread.ts`, `dm-handler.ts` (triggerAiReview), `event-dispatcher.ts` (minor), `exercises.ts` (thread ID persistence), and matching tests.

</domain>

<decisions>
## Implementation Decisions

### Thread Reuse on Re-submission (ADM-01)
- **D-01:** Re-submission reuses the existing review thread. Look up `review_thread_id` on the exercise record. If set, fetch the thread via `client.channels.fetch(threadId)`. If found, unarchive it (`setArchived(false)`), post a separator message ("--- Re-soumission #{submission_count} ---"), then post new submission content + fresh AI review placeholder. Formateur sees full audit trail in one thread.
- **D-02:** If `client.channels.fetch(threadId)` returns null (thread manually deleted), create a new thread silently — no admin alert. Store the new thread ID in DB, overwriting the old one.

### "Ouvrir review" Idempotency (ADM-02)
- **D-03:** Before creating a thread, check `review_thread_id` on the exercise record. If set, fetch the thread. If it still exists in Discord, reply to the interaction with the thread link (no-op). If it doesn't exist (deleted), create a new one and store the ID. This prevents double-click from creating duplicate threads.
- **D-04:** Store `review_thread_id` in DB immediately after thread creation via `updateExercise(exerciseId, { review_thread_id: thread.id })`. This is the idempotency key.

### AI Review Message Update (ADM-03)
- **D-05:** When `createReviewThread()` posts the AI review message (or placeholder "en cours..."), store the message ID via `updateExercise(exerciseId, { review_thread_ai_message_id: aiMessage.id })`.
- **D-06:** Direct update in `triggerAiReview` — after saving AI review to DB, check if `review_thread_ai_message_id` is set on the exercise. If yes (thread opened, placeholder exists), edit that message in place with the real AI review. If no (thread not yet opened), do nothing — `createReviewThread` will show the real review when admin eventually clicks "Ouvrir review".
- **D-07:** Notification update stays in event-dispatcher (existing pattern, untouched). Thread AI message update is separate and direct — no event-dispatcher changes needed.

### Thread ID Persistence
- **D-08:** `review_thread_id` and `review_thread_ai_message_id` columns already exist in DB (migration 017) and types. Just need to actually write to them in `createReviewThread()` and read them in `review-buttons.ts` + `triggerAiReview`.
- **D-09:** `resubmitExercise()` must NOT clear `review_thread_id` (unlike `notification_message_id` which is cleared). The thread persists across re-submissions. Clear `review_thread_ai_message_id` only (new AI review will get a new placeholder message).

### Claude's Discretion
- **Separator message format:** Exact formatting of the re-submission separator in the thread. Must include submission count and timestamp.
- **Thread unarchive error handling:** If `setArchived(false)` fails (permissions, Discord API error), fallback behavior — likely create new thread.
- **Test structure:** How to organize test files — follow existing patterns in `review-buttons.test.ts` and `dm-handler.test.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Handler Code (primary modification targets)
- `packages/bot-discord/src/handlers/review-buttons.ts` — "Ouvrir review" button handler, review decision handler (approve/revision)
- `packages/bot-discord/src/utils/review-thread.ts` — `createReviewThread()` function that builds thread + 4 messages
- `packages/bot-discord/src/handlers/dm-handler.ts` — `triggerAiReview()` (lines 158-205), `notifyAdminChannel()` (lines 672-710)

### Event Dispatcher
- `packages/bot-discord/src/cron/event-dispatcher.ts` — `ai_review_complete` event handler (lines 73-108), updates notification message

### DB Functions
- `packages/core/src/db/formation/exercises.ts` — `updateExercise()`, `resubmitExercise()` (clears `notification_message_id` at line 316), `getExerciseByStudentAndSession()`
- `packages/core/src/db/formation/sessions.ts` — `getSessionByNumber()`

### Types
- `packages/core/src/types/index.ts` — `StudentExercise` interface with `review_thread_id` and `review_thread_ai_message_id` (lines 111-112)

### DB Schema
- `supabase/migrations/017_exercise_submission_v2.sql` — Added `review_thread_id` and `review_thread_ai_message_id` columns

### Specs
- `specs/04-bot-discord/SPEC.md` — Bot Discord spec (exercise flow, review system)
- `specs/01-cerveau-central/SPEC.md` — Core package spec (DB layer, types)

### Prior Phase Artifacts
- `.planning/phases/06-submission-handler-correctness-student-ux/06-CONTEXT.md` — Phase 6 decisions (preview-confirm flow, re-submission logic)
- `.planning/phases/05-db-foundation-core-hardening/05-CONTEXT.md` — Phase 5 decisions (DB schema, atomic session_id)

### Test Patterns
- `packages/bot-discord/src/handlers/review-buttons.test.ts` — Existing review button unit tests
- `packages/bot-discord/src/handlers/dm-handler.test.ts` — Existing DM handler unit tests
- `packages/bot-discord/src/utils/review-thread.test.ts` — Existing review thread unit tests (if any)
- `test/integration-helpers.ts` — Integration test utilities
- `packages/core/src/db/formation/exercises.test.integration.ts` — Exercise DB integration tests

### Codebase Context
- `.planning/codebase/CONCERNS.md` — Exercise submission state machine fragility analysis
- `.planning/codebase/ARCHITECTURE.md` — Handler/agent/DB layer architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notification_message_id` pattern — already stores a Discord message ID in DB and edits it later via event-dispatcher. Exact same pattern applies to `review_thread_ai_message_id`.
- `updateExercise(id, updates)` — generic partial update, already used for `notification_message_id`. Can store `review_thread_id` and `review_thread_ai_message_id`.
- `client.channels.fetch(threadId)` — Discord.js method to retrieve thread by ID. Returns null if deleted.
- `ThreadChannel.setArchived(false)` — Discord.js method to unarchive a thread.
- `createReviewThread()` in `review-thread.ts` — builds thread + 4 messages. Needs to return thread ID and AI message ID for storage.

### Established Patterns
- `notification_message_id` stored after notification post → edited later by event-dispatcher. Same store-then-edit pattern for thread messages.
- `resubmitExercise()` clears `notification_message_id` (forces new notification). Thread ID should NOT be cleared (reuse).
- Status checks in `review-buttons.ts` (lines 92-102) guard against invalid states — extend for idempotency.
- Event dispatcher cron (2-min interval) handles async notification updates.

### Integration Points
- `createReviewThread()` return value needs to change — must return `{ threadId, aiMessageId }` so caller can persist them.
- `handleReviewOpen()` in `review-buttons.ts` is the entry point for thread creation — add DB check before calling `createReviewThread()`.
- `triggerAiReview()` in `dm-handler.ts` — add 5 lines after AI review save to edit thread AI message if it exists.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing patterns for message ID persistence and Discord.js thread management.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-admin-review-ux-test-coverage*
*Context gathered: 2026-03-27*
