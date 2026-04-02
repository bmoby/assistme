# Phase 1: Remove AI Auto-Review - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Strip AI auto-review from the exercise submission flow. After this phase, exercises go directly from `submitted` to admin review — no AI scoring, no AI feedback, no AI placeholder in threads. The manual admin review flow (thread, buttons, feedback DM) remains completely intact.

</domain>

<decisions>
## Implementation Decisions

### ai_reviewed Status Handling
- **D-01:** For NEW submissions, never set status to `ai_reviewed`. Status stays `submitted` until admin acts.
- **D-02:** Existing exercises already in `ai_reviewed` status should be treated as equivalent to `submitted` — code that filters pending exercises should check for `submitted` only going forward, but keep `ai_reviewed` in the type union until Phase 3 cleanup.
- **D-03:** No DB migration needed in this phase — `ai_reviewed` is a value in a text column, not a DB constraint. The type union cleanup happens in Phase 3.

### Submission Flow (dm-handler.ts)
- **D-04:** Remove the fire-and-forget `reviewExercise()` call after successful submission in `executeSubmission`.
- **D-05:** Remove all imports and references to `exercise-reviewer` from dm-handler.ts.
- **D-06:** The exercise status after submission stays `submitted` (no longer transitions to `ai_reviewed`).

### Admin Notification (#admin channel)
- **D-07:** Remove the AI score and recommendation fields from the admin notification embed.
- **D-08:** Keep all other embed fields: student name, session title/module, file list with URLs, image preview, resubmission indicator, previous feedback (for re-submissions).
- **D-09:** The "Ouvrir la review" button stays as-is.

### Review Thread (review-thread.ts)
- **D-10:** Do not create the AI placeholder message in new review threads.
- **D-11:** Do not store `review_thread_ai_message_id` for new submissions (it will be null).
- **D-12:** Remove the logic that edits the AI message in-place when AI review completes (since there is no AI review anymore).
- **D-13:** Thread structure becomes: submission message (files+links) → action buttons (approve/revision). No AI message in between.

### Student DM
- **D-14:** After successful submission, send simple acknowledgment: "Zadanie otpravleno na proverku!" (in Russian) — no score, no AI summary.
- **D-15:** Remove the logic that edits the admin notification with AI score after review completes.

### Review Buttons (review-buttons.ts)
- **D-16:** Update pending exercise checks to filter by `submitted` only (remove `ai_reviewed` from the condition). Keep backward compat by still accepting `ai_reviewed` for old exercises.

### Claude's Discretion
- Exact wording of the Russian acknowledgment DM — should match existing tone
- Whether to log the removal of AI review calls (info vs debug level)
- Whether to add a comment noting the intentional removal

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Exercise Submission Flow
- `packages/bot-discord/src/handlers/dm-handler.ts` — Main submission execution, AI review trigger
- `packages/bot-discord/src/handlers/dm-handler.test.ts` — Tests for submission flow

### Review Thread System
- `packages/bot-discord/src/utils/review-thread.ts` — Thread creation, AI placeholder, re-submission
- `packages/bot-discord/src/utils/review-thread.test.ts` — Tests for thread creation

### Review Buttons
- `packages/bot-discord/src/handlers/review-buttons.ts` — Approve/revision button handlers
- `packages/bot-discord/src/handlers/review-buttons.test.ts` — Tests for review actions

### Admin Commands
- `packages/bot-discord/src/commands/admin/review.ts` — /review command listing pending exercises
- `packages/bot-discord/src/commands/admin/approve.ts` — /approve command
- `packages/bot-discord/src/commands/admin/revision.ts` — /revision command

### AI Exercise Reviewer (to understand what to remove)
- `packages/core/src/ai/formation/exercise-reviewer.ts` — The module being deactivated

### Database Layer
- `packages/core/src/db/formation/exercises.ts` — DB queries filtering by status
- `packages/core/src/types/index.ts` — ExerciseStatus type union

### Other Files with ai_reviewed References
- `packages/core/src/ai/formation/dm-agent.ts` — get_pending_feedback tool filters by ai_reviewed
- `packages/core/src/ai/formation/tsarag-agent.ts` — pending exercises listing
- `packages/bot-discord/src/utils/format.ts` — Status emoji mapping
- `packages/bot-discord/src/cron/event-dispatcher.ts` — Event dispatch
- `packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts` — Test fixtures

### Specs
- `specs/04-bot-discord/SPEC.md` — Bot Discord spec (update after implementation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Key Touchpoints (23 files reference exercise-reviewer or ai_reviewed)
- `packages/core/src/ai/formation/exercise-reviewer.ts` — The AI reviewer module (NOT deleted in this phase, just disconnected)
- `packages/bot-discord/src/handlers/dm-handler.ts` — Fire-and-forget call to `reviewExercise()` at line ~190
- `packages/bot-discord/src/utils/review-thread.ts` — Creates AI placeholder message in thread
- `packages/bot-discord/src/handlers/review-buttons.ts` — Checks `submitted || ai_reviewed` at lines 51, 111
- `packages/core/src/db/formation/exercises.ts` — Multiple queries filter `.in('status', ['submitted', 'ai_reviewed'])`
- `packages/bot-discord/src/utils/format.ts` — Emoji mapping `ai_reviewed: 'robot'`

### Established Patterns
- Status filtering uses `.in('status', [...])` in Supabase queries
- Notification embeds built with discord.js EmbedBuilder
- Review threads use `createReviewThread()` and `reuseReviewThread()`
- Fire-and-forget pattern: `reviewExercise(...).catch(err => logger.error(...))`

### Integration Points
- dm-handler.ts `executeSubmission()` — where AI review is triggered
- review-thread.ts `createReviewThread()` — where AI placeholder is inserted
- review-buttons.ts `handleReviewOpen()` and `handleReviewDecision()` — where ai_reviewed status is checked

</code_context>

<specifics>
## Specific Ideas

- User explicitly said: "la correction n'est jamais bonne, la IA n'est pas bonne pour ca" — removal is intentional, not a regression
- The quiz bot is the real evaluation tool — exercises are proof of engagement, not exams
- Keep the review flow intact — the trainer still wants to manually review and give feedback when he chooses

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-remove-ai-auto-review*
*Context gathered: 2026-03-31*
