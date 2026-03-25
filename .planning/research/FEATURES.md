# Feature Landscape: Exercise Submission Flow

**Domain:** Exercise submission and admin review flow for a Discord education bot (discord.js v14, TypeScript, DM-based student interaction)
**Researched:** 2026-03-25
**Confidence:** HIGH — based primarily on direct codebase analysis of existing implementation, supplemented by discord.js official documentation and community patterns. No heavy reliance on training-data guesses.

---

## Context: What Already Exists

This research covers ONLY new features. The following are already built and tested in v1.0:

| Component | Status | Location |
|-----------|--------|----------|
| DM agent with Claude tool_use loop | Built | `packages/core/src/ai/formation/dm-agent.ts` |
| Multi-message accumulation in DM (in-memory `conversations` Map) | Built | `packages/bot-discord/src/handlers/dm-handler.ts` |
| File/URL/text attachment collection | Built | `dm-handler.ts` + `PendingAttachment[]` |
| `create_submission` tool with session validation | Built | `dm-agent.ts:handleCreateSubmission()` |
| Re-submission path (`resubmitExercise()`) for `revision_needed` status | Built | `packages/core/src/db/formation/exercises.ts` |
| Block when already `submitted` or `ai_reviewed` | Built | `dm-agent.ts` (active submission guard) |
| Admin channel notification embed + "Open review" button | Built | `dm-handler.ts:notifyAdminChannel()` |
| Review thread creation with AI score, history, action buttons | Built | `packages/bot-discord/src/utils/review-thread.ts` |
| Approve/revision buttons in thread, DM feedback to student | Built | `packages/bot-discord/src/handlers/review-buttons.ts` |
| `review_history` JSONB, `submission_count`, `notification_message_id` columns | Built | `supabase/migrations/016_exercise_review_system.sql` |

**Critical gap identified:** There is NO unique DB constraint on `(student_id, session_id)` in `student_exercises`. Uniqueness is enforced only at the application layer inside `handleCreateSubmission()` with a linear scan of the student's existing exercises. This is a race-condition risk and a correctness gap.

---

## Table Stakes

Features users/trainers expect. Missing any of these means the flow breaks down or produces incorrect data.

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Preview before confirm: show what will be submitted and ask "confirm?" | The system prompt already mandates this ("Перед отправкой покажи, что будет отправлено, и спроси подтверждение"). But Claude-driven confirmation is unreliable — LLMs sometimes skip the step, hallucinate confirmation, or misread a vague student reply as confirmation. A deterministic preview step removes this class of bug. | Med | Existing `ConversationState.pendingAttachments` | Claude-side: the prompt says to show preview. Handler-side: the handler should NOT call `create_submission` until a confirmation word/button is received. Currently there is no such gate. Implementation choice: (a) add a confirmation button after Claude shows preview — reliable but adds UI state; (b) make the confirmation purely conversational but add an explicit state flag `awaitingConfirmation: boolean` to `ConversationState` — simpler but still LLM-dependent. Option (a) is correct. |
| Empty submission rejected before DB write | Attempting to submit with zero attachments and zero text content should be refused. Currently the agent can call `create_submission` with no `pendingAttachments` and it will succeed, creating an empty record. | Low | None — purely defensive check | Check in `handleCreateSubmission`: if `pendingAttachments.length === 0` AND no `student_comment`, return `{ error: 'empty_submission' }`. Also validate in the DM handler before forwarding to the agent. |
| Session existence validated before accepting content | Student says "session 99" — the agent calls `get_session_exercise` and the tool returns `session_not_found`, then the agent should stop collecting attachments for that session. Currently the flow does handle this, but the student can accumulate attachments in `pendingAttachments` for a session that doesn't exist — those attachments are held in memory and uploaded on any future `create_submission` call. | Low | Existing `getSessionByNumber()` | Session number should be validated at the start of the submission flow, before file collection begins. State should track the `confirmedSessionNumber` so attachments can't bleed into wrong sessions. |
| Unique per (student, session): DB-level constraint | The uniqueness rule is currently application-level only. A race condition (two concurrent messages triggering two agent loops) can create duplicate rows. | Low-Med | Supabase migration | Add `UNIQUE (student_id, session_id)` constraint to `student_exercises`. Then application logic uses `ON CONFLICT DO UPDATE` or handles the `23505` Postgres error code explicitly. This is a migration: non-breaking because the application guard already prevents most duplicates; unique constraint just makes it atomic. |
| Re-submission allowed after `revision_needed`, not after `approved` | The current code correctly blocks re-submission when status is `approved`. This behavior must not regress. | Low | Existing `resubmitExercise()` | Already implemented. Needs a test. |
| Admin review: re-opening an archived thread or creating a new one | When the admin clicks "Open review" on a re-submission notification, the previous thread for the same exercise may already be archived. The current `handleReviewOpen()` checks status (`submitted` or `ai_reviewed`) and calls `createReviewThread()`, which always creates a new thread. This works but creates a new thread each time. The thread name already includes `(#N)` for re-submissions (`review-thread.ts:L30`). | Low | Existing thread creation logic | Behavior is already functionally correct for re-submissions: new thread, count label. No change needed unless admin wants to reopen archived thread instead. Mark as acceptable as-is. |

---

## Differentiators

Features that make the flow significantly better without being strictly required for correctness.

| Feature | Value Proposition | Complexity | Depends On | Notes |
|---------|-------------------|------------|------------|-------|
| Explicit confirmation button (Yes/No) after preview | Instead of relying on Claude to interpret a student's "ok" or "да" or "confirm", a Discord button makes the confirmation channel unambiguous. Student clicks "Submit" and a `ButtonInteraction` fires a deterministic handler. Eliminates entire class of LLM misparse errors. | Med | discord.js `ActionRowBuilder`, `ButtonBuilder`; new `awaitingConfirmationForSession` state in `ConversationState` | Implementation: after Claude shows preview text, the DM handler sends a separate message with two buttons: `submit_confirm_{exerciseId_or_sessionNumber}` and `submit_cancel_{}`. The button handler calls `create_submission` directly, bypassing Claude for the final action. This is the most impactful UX improvement. |
| Cancel submission mid-flow | Student started collecting files for session 3 but changed their mind. Currently there's no way to clear `pendingAttachments` without waiting for conversation timeout (30 min). A "cancel" intent (natural language or cancel button) should clear the pending state. | Low | `ConversationState.pendingAttachments`; `_clearStateForTesting()` pattern already exists | Add a `cancel_submission` handling path in the DM agent system prompt + a `clear_pending` tool that empties `pendingAttachments` and resets `confirmedSessionNumber`. This is low-risk because it only affects in-memory state. |
| Show pending attachments count in preview | The preview message should list each pending attachment by name + type so the student can verify they attached the right files. Currently the system prompt says to show what will be submitted, but the agent only knows about attachments through the `newAttachmentsInfo` strings injected into the context — it never has the actual file list. | Low | `pendingAttachments` available in `DmAgentContext` | Inject a structured attachment summary into the user message context at preview time: `"Накоплено для сдачи: [filename1.pdf (image), link.com (url)]"`. Claude already receives `newAttachmentsInfo` per message; extend this to a periodic summary. |
| Admin: one-click access to all pending submissions for a session | The `review_session_` button flow already exists in `review-buttons.ts:handleReviewSession()`. The differentiator is surfacing this prominently in the daily digest cron and making the session-level view the primary admin entry point rather than per-submission notifications. | Low | Existing `exercise-digest.ts`, `review_session_` buttons | The `exercise-digest.ts` cron already exists. Wiring the session-level overview button into the digest message is a config/UX change, not a new feature. |
| Admin: inline AI score visible on the notification card before opening thread | The notification embed already has an "AI score: en cours..." field. The `ai_review_complete` event triggers a notification message edit. The differentiator is ensuring the edit reliably reaches the correct message — currently `notification_message_id` is cleared on re-submission (`resubmitExercise()` sets it to `null`) so old notifications lose their connection. | Low-Med | `notification_message_id` lifecycle; `ai_review_complete` event dispatch | On re-submission, the old notification message should either be updated to show "replaced by re-submission" or the new notification should get the new `notification_message_id`. Currently: re-submission sends a new notification, old one has no button (because `updateExercise` already removes the button on review completion). Lifecycle is handled, just needs a test. |

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| File format enforcement (block submission if wrong type) | The system prompt explicitly says "Si le format ne correspond pas, préviens mais ne bloque pas". Students use diverse tools (Notion links, Google Docs, Keynote exports). Blocking harms completion rates in ways that are hard to undo. | Warn the student about unexpected format in Claude's reply. Log the mismatch. Never hard-block. |
| Multiple submissions per session (allowing parallel drafts) | The uniqueness rule (one active submission per session) is a deliberate product decision. Allowing parallel drafts creates admin UX complexity (which one to review?) with no student benefit. | Enforce uniqueness, route re-submission to the controlled re-submit path. |
| Submission edit after confirm (pre-review mutation) | After `create_submission`, the exercise record is in the admin review queue. Allowing the student to edit attachments after submission creates a TOCTOU race: admin opens thread, sees v1; student edits, admin reviews v2 without knowing. | Re-submission after `revision_needed` is the correct mutability window. Before that, submissions are immutable. |
| Discord modals for submission content | Modals are limited to 5 short text fields, no file upload, no URL detection, max 4000 chars total. They are fundamentally incompatible with the multi-attachment DM flow. The existing conversational DM approach is correct. | Keep the DM conversation model. |
| Automatic session number detection from message text | Trying to infer "I'm submitting for session 3" from freeform student text creates ambiguity. The agent already asks explicitly ("для какой сессии?") if not specified. Automatic inference would cause silent mis-routing. | Keep the explicit ask. Claude handles the detection from structured student replies; don't bypass it with regex heuristics. |
| Submission state persisted to DB between bot restarts | `ConversationState` and `pendingAttachments` are in-memory. If the bot restarts, state is lost. Adding DB persistence for in-progress submissions is a significant complexity increase with low payoff — submissions are short-lived interactions (5-15 min typically). | Accept the restart behavior. Student can start again. Document it. |
| Student-facing progress dashboard (web UI or slash command) | Out of scope per PROJECT.md. DM agent `get_student_progress` tool already covers this via conversational query. | Keep it conversational. No slash commands for progress tracking. |

---

## Feature Dependencies

```
DB constraint: UNIQUE(student_id, session_id)
  └── Blocks: uniqueness logic simplification in handleCreateSubmission()
  └── Unblocks: removing the linear scan + race window

Session validation before file collection
  └── Requires: new ConversationState field: confirmedSessionNumber
  └── Blocks: empty-session attachment accumulation bug

Preview before confirm
  └── Requires: ConversationState.awaitingConfirmation flag
  └── OR: confirmation button (preferred)
  └── Blocks: silent LLM-driven double-submissions

Confirmation button (Yes/No)
  └── Requires: new button customId prefix registered in button-handler.ts
  └── Requires: ConversationState extended with pendingSubmission payload
  └── Depends on: preview step being shown first
  └── Blocks: direct create_submission call from button handler

Cancel mid-flow
  └── Requires: preview/session-validation state fields
  └── Low dependency — can be added independently

Empty submission validation
  └── No dependencies — purely defensive, add at handleCreateSubmission + DM handler layers

All new ConversationState fields
  └── dm-handler.ts interface extension
  └── _clearStateForTesting() must clear all new fields
  └── All test fixtures must include new fields
```

---

## Exact Gaps vs Existing Code (with file references)

This section maps each new feature to the exact location it needs to change. This is actionable for roadmap phase planning.

| New Feature | File(s) to Modify | Type of Change |
|-------------|-------------------|----------------|
| Empty submission block | `packages/core/src/ai/formation/dm-agent.ts:handleCreateSubmission()` | Add guard before insert |
| Session validation before file collection | `dm-handler.ts:ConversationState` + `dm-agent.ts` system prompt | State field + prompt instruction |
| Preview confirmation state | `dm-handler.ts:ConversationState` (add `awaitingConfirmation`, `confirmedSessionNumber`) | Interface extension |
| Confirmation button (send + handle) | `dm-handler.ts:processDmMessage()` + new entry in `button-handler.ts` | New button flow |
| Cancel mid-flow | `dm-agent.ts:TOOLS` + `dm-handler.ts:processDmMessage()` | New tool + state reset |
| DB unique constraint | New migration file: `017_exercise_unique_per_session.sql` | Supabase migration |
| `handleCreateSubmission` uses constraint | `dm-agent.ts:handleCreateSubmission()` | Handle `23505` error |
| Tests for all new paths | `dm-handler.test.ts`, `dm-agent.test.ts`, new `dm-agent.integration.test.ts` cases | Test additions |

---

## MVP Recommendation

For this milestone, the minimum that delivers the core value ("no duplicates, no empty submissions, no surprise confirms"):

1. **Empty submission validation** — Low effort, prevents embarrassing empty exercise records.
2. **DB unique constraint `(student_id, session_id)`** — Low effort (single migration), eliminates the race window entirely.
3. **Preview confirmation button** — Medium effort, the most impactful correctness improvement. Replaces LLM-driven confirmation with a deterministic button gate.
4. **Session number locked before file collection** — Low effort, prevents attachment bleed between sessions.

Defer to a second pass if time constrained:
- **Cancel mid-flow tool** — Nice UX, not a correctness issue.
- **Inline AI score on notification card reliability fix** — Already works in the happy path; edge case improvement.
- **Admin digest wiring** — Already functional via existing crons; purely presentational.

---

## Sources

- `packages/bot-discord/src/handlers/dm-handler.ts` — Existing multi-message state, attachment handling, lock queue
- `packages/core/src/ai/formation/dm-agent.ts` — `handleCreateSubmission()`, uniqueness guard, re-submission path
- `packages/core/src/db/formation/exercises.ts` — `resubmitExercise()`, `submitExercise()`, status machine
- `packages/bot-discord/src/handlers/review-buttons.ts` — Admin thread open, approve/revision flow, thread archive
- `packages/bot-discord/src/utils/review-thread.ts` — Thread creation with history
- `supabase/migrations/004_students_system.sql`, `005_sessions_system.sql`, `016_exercise_review_system.sql` — Schema analysis
- [discord.js Collectors official guide](https://discordjs.guide/popular-topics/collectors) — HIGH confidence (official docs, message collector patterns and confirmation button patterns)
- [discord.js Modals official guide](https://discordjs.guide/legacy/interactions/modals) — HIGH confidence (confirms modals are incompatible with file submission UX)
- [discord-api-docs discussion: most wanted modal features #5883](https://github.com/discord/discord-api-docs/discussions/5883) — MEDIUM confidence (community, confirms modal limitations for file-heavy flows)
