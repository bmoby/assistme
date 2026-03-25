# Architecture Patterns — Exercise Submission Flow

**Domain:** Exercise submission improvements for Discord bot (v2.0 milestone)
**Researched:** 2026-03-25
**Scope:** Integration with existing dm-handler.ts architecture — how new features fit,
what must change, what is new, and in what order to build.

---

## Current Architecture (Baseline)

### Component Map

```
Discord Gateway
      |
      v
messageCreate event
      |
      v
dm-handler.ts (setupDmHandler)
  |  processingLocks map (per-userId Promise chain — serializes concurrent messages)
  |  conversations map (ConversationState per userId — TTL 30 min)
  |       |
  |       v
  |  processDmMessage()
  |    +-- attachment validation + buffer download into pendingAttachments
  |    +-- URL extraction from message.content into pendingAttachments
  |    +-- user message appended to conv.messages (trimmed to last 20)
  |    +-- runDmAgent({ discordUserId, messages, pendingAttachments, newAttachmentsInfo })
  |           |
  |           v
  |    packages/core/src/ai/formation/dm-agent.ts
  |       Claude tool_use loop (max 5 iterations, claude-sonnet-4-6)
  |       Tools:
  |         get_student_progress     — DB read, no side effects
  |         get_session_exercise     — DB read, validates session exists + published
  |         create_submission        — WRITE: creates/updates exercise record
  |         get_pending_feedback     — DB read
  |         search_course_content    — pgvector search, no side effects
  |           |
  |           v
  |    create_submission tool => handleCreateSubmission()
  |         +-- getSessionByNumber() — validates session in DB
  |         +-- getExercisesByStudent() — checks for active/revision status
  |         +-- submitExercise() OR resubmitExercise()
  |         +-- addAttachment() per file
  |         +-- triggerAiReview() fire-and-forget (uploadFileToStorage + reviewExercise + setAiReview)
  |
  +-- result.submissionId? => notifyAdminChannel() fire-and-forget
        +-- getExercise() + getStudentByDiscordId() + getSession() + getAttachmentsByExercise()
        +-- formatSubmissionNotification() embed
        +-- "Ouvrir la review" button (customId: review_open_{exerciseId})
        +-- updateExercise(notification_message_id)

buttonInteraction event
      |
      v
review-buttons.ts (registerReviewButtons)
  +-- review_open_{id}     => handleReviewOpen()
  |     +-- guard: status must be submitted or ai_reviewed
  |     +-- createReviewThread(adminChannel, exercise, student, session)
  |           review-thread.ts:
  |           +-- thread name: "Review: {name} — Session {N} (#M)"
  |           +-- message 1: submissionMsg (files, links, signed URLs)
  |           +-- message 2: aiReviewMsg (score, strengths, improvements) OR "en cours..."
  |           +-- message 3: historyMsg (previous round context, re-submissions only)
  |           +-- message 4: action buttons (review_approve_{id}, review_revision_{id})
  |
  +-- review_approve_{id}  => handleReviewDecision(approve=true)
  +-- review_revision_{id} => handleReviewDecision(approve=false)
  |     +-- guard: status must be submitted or ai_reviewed
  |     +-- collect non-bot thread messages as feedback text
  |     +-- updateExerciseStatus(id, approved | revision_needed, feedback)
  |     +-- DM student via member.createDM() (formatStudentFeedbackDM)
  |     +-- edit #admin notification embed (remove button, update status)
  |     +-- archive thread (thread.setArchived(true))
  |
  +-- review_session_{n}   => handleReviewSession()
        +-- getPendingExercisesBySession(n)
        +-- embed listing pending exercises
        +-- per-student open buttons (review_open_{id})
```

### Key In-Memory State

**ConversationState** (dm-handler.ts, persists across messages for same userId):
```typescript
interface ConversationState {
  studentId: string;          // resolved lazily by the agent
  discordUserId: string;
  messages: ConversationMessage[];     // last 20 trimmed
  pendingAttachments: PendingAttachment[];  // cleared when create_submission succeeds
  lastActivityAt: Date;                // TTL reference for 30-min cleanup
}
```

**processingLocks** (dm-handler.ts): `Map<userId, Promise<void>>` — ensures messages
from the same user are processed sequentially, not concurrently.

### Key DB Shape (StudentExercise)

```
status:                   submitted | ai_reviewed | reviewed | approved | revision_needed
session_id:               FK to sessions (set during create_submission)
submission_count:         integer, increments on resubmitExercise()
review_history:           ReviewHistoryEntry[] — previous rounds preserved on re-submit
notification_message_id:  Discord message ID in #admin — used to edit the notification embed
```

---

## New Features — Integration Analysis

Each feature below maps to a requirement from PROJECT.md. For each:
- What already exists
- What the actual gap is
- What minimal change is needed

### Feature 1: Accumulation + preview before confirmation

**Current state:** Accumulation is fully implemented.
`processDmMessage()` pushes each file buffer and detected URL into
`conv.pendingAttachments` across multiple messages before any submission occurs.
The system prompt instructs Claude: "Перед отправкой покажи, что будет отправлено,
и спроси подтверждение."

**Gap:** The preview-confirm flow is entirely conversational (natural language).
There is no structural guard preventing Claude from calling `create_submission` before
the student has confirmed. In practice Claude follows the instruction, but the
system-prompt-only constraint has no enforcement point.

**Required change (minimal):**
- In `handleCreateSubmission()` in dm-agent.ts: require `student_comment` or non-empty
  `pendingAttachments` before proceeding (see Feature 5 — empty guard covers this).
- Strengthen the system prompt wording to be unambiguous: "Никогда не вызывай
  create_submission до явного подтверждения студента."
- No structural change to dm-handler.ts is needed. The processing lock already
  serializes messages, so a student can safely send files across several messages
  before saying "да, отправляй" — the preview-confirm flow is entirely in Claude's
  turn management.

**Verdict:** No new files. One system prompt edit. One guard in dm-agent.ts.

---

### Feature 2: Session validation (must exist and be published)

**Current state:** Already enforced at two points:
- `handleGetSessionExercise()` checks `session.status !== 'published'` and returns
  `{ error: 'session_not_found' }` or `{ error: 'session_not_published' }`.
- `handleCreateSubmission()` calls `getSessionByNumber(sessionNumber)` and returns
  `{ error: 'session_not_found' }` if missing or not published.

**Gap:** None. The tool layer already rejects invalid sessions. The agent propagates
the error to the student in natural language.

**Required change:** None structural. Verify the system prompt instructs the agent
to always ask "for which session?" before accumulating attachments — it already does.

---

### Feature 3: Uniqueness — 1 student per session

**Current state:** Application-layer guard in `handleCreateSubmission()`:
```typescript
const activeForSession = existingExercises.find(
  (e) => e.session_id === session.id &&
         (e.status === 'submitted' || e.status === 'ai_reviewed')
);
if (activeForSession) return { error: 'already_submitted' };
```

The `processingLocks` per userId serializes messages, so a single student cannot
create two concurrent submissions from rapid successive messages.

**Gap:** No DB-level constraint. A race condition is theoretically possible if two
separate processes (e.g., a crashed and restarted pod) replay the same event. More
importantly, the current `getExercisesByStudent()` + in-memory filter is a full
table scan per student — workable at 30 students, inefficient at scale.

**Required change:**
- New migration: add a partial unique index on `student_exercises`:
  ```sql
  CREATE UNIQUE INDEX uq_student_exercise_active
  ON student_exercises (student_id, session_id)
  WHERE status IN ('submitted', 'ai_reviewed');
  ```
  This allows multiple historical rows (revision_needed, approved) for the same
  (student, session) pair but prevents two active submissions.
- New DB function `getExerciseByStudentAndSession(studentId, sessionId)` in exercises.ts
  as a targeted alternative to the in-memory filter — used by dm-agent.ts for the
  uniqueness check.

---

### Feature 4: Re-submission after revision_needed

**Current state:** Fully implemented. `resubmitExercise()` in exercises.ts:
- Archives the current round into `review_history`
- Clears ai_review, feedback, reviewed_at
- Resets status to `submitted`
- Increments `submission_count`
- Deletes old attachment DB records and storage files (fire-and-forget)

The agent also detects `revision_needed` in `handleCreateSubmission()` and calls
`resubmitExercise()` instead of `submitExercise()`.

**Gap:** None for the core flow. UX gap: after receiving `revision_needed` via DM,
the student must remember they can re-submit. The feedback DM already ends with
"Исправь указанные моменты и отправь задание заново." — adequate.

**Required change:** None.

---

### Feature 5: Empty submission validation

**Current state:** No guard exists. If `pendingAttachments` is empty, `handleCreateSubmission()`
proceeds, creates an exercise record with `submission_type: 'text'` and empty
`submission_url`. The student submits nothing.

**Required change:**
Add at the top of `handleCreateSubmission()` in dm-agent.ts:
```typescript
if (pendingAttachments.length === 0) {
  return JSON.stringify({
    error: 'empty_submission',
    message: 'Нет прикреплённых файлов или ссылок. Прикрепи что-нибудь перед отправкой.',
  });
}
```
Also update the system prompt: "Не вызывай create_submission если нет прикреплённых
файлов или ссылок (pendingAttachments пуст)."

This is a single-line guard — the smallest change with the highest correctness value.

---

### Feature 6: Admin review UX improvements

**Current state:** `review-thread.ts` creates a well-structured thread with
submission content, AI review, history, and action buttons. `handleReviewDecision()`
collects thread messages as feedback, updates DB, DMs student, edits notification,
archives thread.

**Gap 1 — Thread is created fresh on every "Ouvrir la review" click:**
On re-submission, the admin clicks the button and a new thread is created with the
re-submission. There is no link to the previous review thread. The admin loses
continuity — they cannot see the previous round's conversation in context.

**Gap 2 — AI review "en cours..." is never updated in the thread:**
The thread is opened before AI review completes (AI review is fire-and-forget).
Message 2 in the thread says "🤖 Review IA : en cours...". The
`ai_review_complete` formation event is fired when AI review completes, but no
consumer updates the thread message.

**Required changes for Gap 1:**
- Add `review_thread_id: string | null` column to `student_exercises` (migration).
- After `createReviewThread()` succeeds, call a new `updateExerciseThreadId(exerciseId, thread.id)` function.
- In `handleReviewOpen()`: before creating a new thread, check `exercise.review_thread_id`.
  If set, attempt to unarchive and post a "=== Re-soumission #{N} ===" header in the existing
  thread rather than creating a new one.
- Update `createReviewThread()` signature to accept `existingThread?: ThreadChannel`.
  When provided, skip thread creation and post the messages into the existing thread.

**Required changes for Gap 2:**
- Add `review_thread_ai_message_id: string | null` column to `student_exercises` (same migration).
- After posting message 2 ("en cours...") in `createReviewThread()`, store the returned
  message ID via a new update call.
- Add a case to the event-dispatcher cron (or a dedicated handler) for
  `ai_review_complete` events: fetch exercise, fetch the thread, edit the AI message
  by its stored ID with the real review content.

---

## State Machine Design

### Student-side Submission Flow (conversational)

```
[IDLE]
  Student has no pending attachments.
  conv.pendingAttachments = []
      |
      |  Student sends file(s) or URL(s)
      v
[ACCUMULATING]
  conv.pendingAttachments.length > 0
  Files buffered in memory; no DB write yet.
      |
      |  Agent calls get_session_exercise to confirm session
      |  Agent formats preview: "Ты хочешь сдать для сессии N:
      |    - file1.pdf
      |    - https://github.com/...
      |  Отправить? (да/нет)"
      v
[PREVIEW]
  No structural state needed in dm-handler.ts.
  This is a conversational state managed by Claude's context.
  conv.messages contains the preview message as last assistant turn.
      |
      |  Student says "да" or equivalent confirmation
      v
[CONFIRMED — create_submission called by Claude]
      |
      |  handleCreateSubmission() succeeds
      |  returns { success: true, exercise_id: "..." }
      v
[SUBMITTED]
  conv.pendingAttachments cleared in dm-handler.ts
  notifyAdminChannel() fires (fire-and-forget)
  Student receives confirmation text

             ==================
             DB Exercise Status Machine (admin-side):

  [submitted]
      |  AI review fires in background (fire-and-forget)
      v
  [ai_reviewed]  (score + recommendation stored in ai_review JSONB)
      |
      |  Admin clicks "Ouvrir la review" in #admin
      v
  [review thread open]
      |
      +----------+------------------+
      |                             |
  "Approuver"               "Demander revision"
      |                             |
      v                             v
  [approved]               [revision_needed]
                                    |
                          Student re-submits via DM
                                    |
                                    v
                          [submitted]  <- cycle restarts
                          (review_history preserves previous round)
```

### Why No Explicit Phase Field in ConversationState

Adding `submissionPhase: 'idle' | 'accumulating' | 'preview' | 'confirm'` to
`ConversationState` would require dm-handler.ts to inspect Claude's response text
to detect phase transitions — which is fragile and couples the handler to Claude's
language choices.

The better approach: let Claude manage the conversational phase entirely through
context (messages array). The only structural invariant dm-handler.ts enforces is:
- Clear `pendingAttachments` when `result.submissionId` is set.
- Never allow concurrent processing for the same user (already done via processingLocks).

The critical safety guard lives in `handleCreateSubmission()`: reject if
`pendingAttachments.length === 0`. Everything else is system prompt discipline.

---

## New vs Modified Components

### Modified Files (existing)

| File | Change | Why |
|------|--------|-----|
| `packages/core/src/ai/formation/dm-agent.ts` | Add empty-submission guard in `handleCreateSubmission()`. Strengthen system prompt. | Feature 5 |
| `packages/core/src/types/index.ts` | Add `review_thread_id: string \| null` and `review_thread_ai_message_id: string \| null` to `StudentExercise`. | Gap 1 + Gap 2 |
| `packages/core/src/db/formation/exercises.ts` | Add `getExerciseByStudentAndSession()`. Add `updateExerciseThreadId()`. | Feature 3 + Gap 1 |
| `packages/bot-discord/src/handlers/review-buttons.ts` | In `handleReviewOpen()`: check `exercise.review_thread_id`; unarchive + reuse if present; store thread ID after creation. | Gap 1 |
| `packages/bot-discord/src/utils/review-thread.ts` | Accept optional `existingThread?: ThreadChannel` param; when present, post into existing thread instead of creating one. | Gap 1 |
| `packages/bot-discord/src/cron/event-dispatcher.ts` | Add handler for `ai_review_complete` events that edits the thread AI message. | Gap 2 |

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/0XX_exercise_submission_v2.sql` | Add `review_thread_id` and `review_thread_ai_message_id` nullable columns to `student_exercises`. Add partial unique index on `(student_id, session_id) WHERE status IN ('submitted', 'ai_reviewed')`. |

No new packages. No new top-level modules. All changes are contained within existing
files and one migration.

---

## Component Boundaries

| Component | Owns | Does NOT own |
|-----------|------|-------------|
| `dm-handler.ts` | Attachment accumulation, processing lock chain, conversation TTL, clearing pendingAttachments after submit | DB operations, Discord API beyond DM channel, Claude API |
| `dm-agent.ts` (core) | Claude tool loop, submission logic, AI review trigger, input validation (empty guard) | Discord API, conversation state map in dm-handler.ts |
| `review-buttons.ts` (bot) | Admin review UX, button interactions, thread lifecycle, feedback collection | Student-side DM flow, submission creation |
| `review-thread.ts` (utils) | Thread structure and content formatting, message composition | Button registration, DB status updates |
| `exercises.ts` (core/db) | All student_exercises CRUD, uniqueness enforcement at application layer | Discord API, Claude API |

The boundary that matters most: **dm-agent.ts must remain a pure function from
dm-handler.ts's perspective.** It receives context, returns a result. It must not
modify dm-handler.ts's in-memory state. Phase or state changes flow only outward
through `DmAgentResponse` (specifically `submissionId` — the signal that triggers
`pendingAttachments` cleanup in the handler).

---

## Build Order

Build in this sequence to respect type and runtime dependencies:

**Step 1 — DB migration (no code deps, unblocks everything)**
```sql
ALTER TABLE student_exercises
  ADD COLUMN review_thread_id TEXT,
  ADD COLUMN review_thread_ai_message_id TEXT;

CREATE UNIQUE INDEX uq_student_exercise_active
ON student_exercises (student_id, session_id)
WHERE status IN ('submitted', 'ai_reviewed');
```
Write migration. Apply locally via `supabase db reset`. No code changes yet.
Verify: migration applies cleanly, existing data unaffected.

**Step 2 — Types update (unblocks all TypeScript files)**
Add `review_thread_id` and `review_thread_ai_message_id` to `StudentExercise`
interface in `packages/core/src/types/index.ts`.
No logic change — just typing reflecting the new columns.
Verify: `pnpm typecheck` passes.

**Step 3 — New DB functions (unblocks review-buttons changes)**
Add to `packages/core/src/db/formation/exercises.ts`:
- `getExerciseByStudentAndSession(studentId: string, sessionId: string): Promise<StudentExercise | null>`
- `updateExerciseThreadId(id: string, threadId: string, aiMessageId?: string): Promise<void>`

Export both from `packages/core/src/index.ts`.
Write unit tests for both functions.
Verify: unit tests pass.

**Step 4 — Empty submission guard (isolated, highest value)**
In `packages/core/src/ai/formation/dm-agent.ts`, in `handleCreateSubmission()`:
add the empty guard. Strengthen the system prompt.
Write unit tests: assert that `create_submission` with empty pendingAttachments
returns the `empty_submission` error and does not call `submitExercise()`.
Verify: unit tests pass. Manual test: send "сдаю задание 3" with no files, verify
the bot refuses.

**Step 5 — Review thread reuse (builds on Steps 2 + 3)**
Update `packages/bot-discord/src/utils/review-thread.ts`:
- Add optional `existingThread?: ThreadChannel` parameter.
- If provided: unarchive, post a re-submission header, then post the standard
  review messages into the existing thread.
- If not provided: create new thread as before.

Update `packages/bot-discord/src/handlers/review-buttons.ts` in `handleReviewOpen()`:
- After loading exercise, check `exercise.review_thread_id`.
- If set: fetch the thread via `client.channels.fetch(exercise.review_thread_id)`.
  If it exists and is a ThreadChannel, pass it as `existingThread`.
  If not found (deleted), fall through to create a new one.
- After thread creation (new or reuse): call `updateExerciseThreadId(exerciseId, thread.id)`.

Write unit tests for both `handleReviewOpen()` paths (new thread vs reuse).
Verify: unit tests pass. Integration test: submit twice, open review twice, verify
second open reuses the first thread.

**Step 6 — AI review message update via event (builds on Steps 2 + 3 + 5)**
Update `packages/bot-discord/src/cron/event-dispatcher.ts` to handle
`ai_review_complete` events:
- Load exercise (now has `review_thread_ai_message_id`).
- Fetch the thread and the stored message.
- Edit the message with the real AI review content from `exercise.ai_review`.

Update `packages/bot-discord/src/utils/review-thread.ts`: after posting message 2
("en cours..."), return the message ID (or store it immediately via
`updateExerciseThreadId`).

Write integration test: submit with AI review, open thread, simulate
`ai_review_complete` event, verify thread message is updated.
Verify: integration test passes.

**Step 7 — E2E verification**
Synthetic event flows through the full path:
- Submit → accumulate → preview → confirm → submitted → admin notified
- Revision → re-submit → existing thread unarchived and reused
- Submit with no files → rejected with empty_submission error

---

## Integration Points Summary

### dm-handler.ts touch points

| Touch point | Current behavior | New behavior |
|-------------|-----------------|--------------|
| After `result.submissionId` check | Clears `pendingAttachments`, fires notifyAdminChannel | No change — existing reset is sufficient |
| `_clearStateForTesting()` | `conversations.clear()` | No change — clearing the map handles all fields |
| Attachment accumulation | Pushes to `pendingAttachments`, no phase tracking | No change — phase tracking stays in Claude's context |

dm-handler.ts requires zero structural changes for this milestone.

### dm-agent.ts touch points

| Touch point | Current behavior | New behavior |
|-------------|-----------------|--------------|
| `handleCreateSubmission()` start | No input validation | Add: reject if `pendingAttachments.length === 0` |
| System prompt | "Перед отправкой покажи что будет отправлено" | Strengthen: forbid `create_submission` when empty |
| `DmAgentResponse` interface | `{ text, submissionId, isResubmission, submissionCount }` | No new fields needed |

### review-buttons.ts touch points

| Touch point | Current behavior | New behavior |
|-------------|-----------------|--------------|
| `handleReviewOpen()` | Always calls `createReviewThread(adminChannel, exercise, student, session)` | Before creating: check `exercise.review_thread_id`; if found, fetch thread and pass as `existingThread` |
| After `createReviewThread()` | No thread ID stored | Call `updateExerciseThreadId(exerciseId, thread.id, aiMessageId)` |
| Imports from `@assistme/core` | Existing imports | Add: `updateExerciseThreadId` |

### review-thread.ts touch points

| Touch point | Current behavior | New behavior |
|-------------|-----------------|--------------|
| `createReviewThread(adminChannel, exercise, student, session)` | Creates new thread unconditionally | Add optional `existingThread?: ThreadChannel`; if provided, unarchive and post into it; return thread + AI message ID |
| Message 2 ("en cours...") | No ID stored | Capture `const aiMsg = await thread.send(...)`, return `aiMsg.id` |

### exercises.ts touch points

| Touch point | Current behavior | New behavior |
|-------------|-----------------|--------------|
| No `getExerciseByStudentAndSession` | Caller uses `getExercisesByStudent()` + in-memory filter | New targeted query function |
| No `updateExerciseThreadId` | Caller uses generic `updateExercise()` | Convenience wrapper — enforces type safety |

### Migration touch points

| Column | Default | Nullability | Impact on existing code |
|--------|---------|-------------|------------------------|
| `review_thread_id` | NULL | nullable | No breakage — new optional field |
| `review_thread_ai_message_id` | NULL | nullable | No breakage — new optional field |
| Partial unique index | — | — | No breakage — filtered to active statuses only |

---

## Scalability Considerations

| Concern | At 30 students (current) | At 300 students |
|---------|--------------------------|-----------------|
| In-memory conversation state | Negligible — 30 Map entries | Fine — 300 entries, < 1 MB |
| Processing lock chain per user | Fine — per-user serialization, independent | Fine — locks are independent |
| DB uniqueness check | Application-layer filter over ~30 rows | Partial unique index enforces at DB level |
| Thread unarchive API call | 1 Discord API call per review open | 1 call — not a hot path |
| `ai_review_complete` event dispatch | 1 message edit per submission | 1 edit — fire-and-forget, fine at scale |

The partial unique index is a correctness requirement even at 30 students. All other
changes are O(1) per submission — no fan-out, no batch operations.

---

## Sources

All findings derived directly from reading working codebase source files (HIGH confidence).
No external sources consulted — this is integration analysis of existing code, not
ecosystem research.

Files read:
- `/packages/bot-discord/src/handlers/dm-handler.ts`
- `/packages/bot-discord/src/handlers/review-buttons.ts`
- `/packages/bot-discord/src/utils/review-thread.ts`
- `/packages/bot-discord/src/utils/format.ts`
- `/packages/bot-discord/src/config.ts`
- `/packages/core/src/ai/formation/dm-agent.ts`
- `/packages/core/src/db/formation/exercises.ts`
- `/packages/core/src/types/index.ts`
- `/.planning/PROJECT.md`
