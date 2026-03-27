# Phase 7: Admin Review UX + Test Coverage - Research

**Researched:** 2026-03-27
**Domain:** Discord.js thread management, idempotency patterns, Vitest unit/integration test coverage
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Thread Reuse on Re-submission (ADM-01)**
- D-01: Re-submission reuses the existing review thread. Look up `review_thread_id` on the exercise record. If set, fetch the thread via `client.channels.fetch(threadId)`. If found, unarchive it (`setArchived(false)`), post a separator message ("--- Re-soumission #{submission_count} ---"), then post new submission content + fresh AI review placeholder. Formateur sees full audit trail in one thread.
- D-02: If `client.channels.fetch(threadId)` returns null (thread manually deleted), create a new thread silently — no admin alert. Store the new thread ID in DB, overwriting the old one.

**"Ouvrir review" Idempotency (ADM-02)**
- D-03: Before creating a thread, check `review_thread_id` on the exercise record. If set, fetch the thread. If it still exists in Discord, reply to the interaction with the thread link (no-op). If it doesn't exist (deleted), create a new one and store the ID. This prevents double-click from creating duplicate threads.
- D-04: Store `review_thread_id` in DB immediately after thread creation via `updateExercise(exerciseId, { review_thread_id: thread.id })`. This is the idempotency key.

**AI Review Message Update (ADM-03)**
- D-05: When `createReviewThread()` posts the AI review message (or placeholder "en cours..."), store the message ID via `updateExercise(exerciseId, { review_thread_ai_message_id: aiMessage.id })`.
- D-06: Direct update in `triggerAiReview` — after saving AI review to DB, check if `review_thread_ai_message_id` is set on the exercise. If yes (thread opened, placeholder exists), edit that message in place with the real AI review. If no (thread not yet opened), do nothing — `createReviewThread` will show the real review when admin eventually clicks "Ouvrir review".
- D-07: Notification update stays in event-dispatcher (existing pattern, untouched). Thread AI message update is separate and direct — no event-dispatcher changes needed.

**Thread ID Persistence**
- D-08: `review_thread_id` and `review_thread_ai_message_id` columns already exist in DB (migration 017) and types. Just need to actually write to them in `createReviewThread()` and read them in `review-buttons.ts` + `triggerAiReview`.
- D-09: `resubmitExercise()` must NOT clear `review_thread_id` (unlike `notification_message_id` which is cleared). The thread persists across re-submissions. Clear `review_thread_ai_message_id` only (new AI review will get a new placeholder message).

### Claude's Discretion
- Separator message format: Exact formatting of the re-submission separator in the thread. Must include submission count and timestamp.
- Thread unarchive error handling: If `setArchived(false)` fails (permissions, Discord API error), fallback behavior — likely create new thread.
- Test structure: How to organize test files — follow existing patterns in `review-buttons.test.ts` and `dm-handler.test.ts`.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-01 | Re-soumission reutilise le thread de review existant au lieu d'en creer un nouveau | D-01, D-02: `client.channels.fetch` + `setArchived(false)` + separator message; fallback to new thread if fetch returns null |
| ADM-02 | Bouton "Ouvrir review" est idempotent — double-clic ne cree pas de thread doublon | D-03, D-04: DB read before `createReviewThread`, reply with thread link if already exists; `updateExercise` as idempotency key |
| ADM-03 | Message AI dans le thread se met a jour en place quand la review AI est terminee | D-05, D-06: store `review_thread_ai_message_id` on thread creation; edit message in `triggerAiReview` after AI save |
| TST-01 | Tests unitaires et d'integration couvrant tous les nouveaux comportements | Unit tests extend `review-buttons.test.ts`; new `review-thread.test.ts`; extend `dm-handler.test.ts`; integration test extends `exercises.integration.test.ts` |
</phase_requirements>

---

## Summary

This phase has two orthogonal workstreams: (1) making the admin review UX robust by wiring up the already-existing `review_thread_id` and `review_thread_ai_message_id` DB columns into the handler code, and (2) writing tests that cover the complete exercise state machine. The DB foundation is fully in place from Phase 5 (migration 017 added both columns; the `StudentExercise` type already includes them; `createExercise` fixture defaults both to `null`). No schema or type changes are needed.

The implementation surface is narrow and well-defined. Three files need surgical changes: `review-thread.ts` (return thread/message IDs), `review-buttons.ts` (idempotency check + thread reuse logic), and `dm-handler.ts` (`triggerAiReview` adds 5–8 lines to edit the placeholder). The `resubmitExercise` function in `exercises.ts` needs one change: clear `review_thread_ai_message_id` but preserve `review_thread_id`.

The test strategy follows existing patterns exactly. Unit tests use the `ButtonInteractionBuilder` + `vi.mock('@assistme/core')` approach already established in `review-buttons.test.ts`. Integration tests use the `exercises.integration.test.ts` fixture pattern (local Supabase via `globalSetup.ts`, `createTestClient()`, cleanup in `afterAll`). No new test infrastructure is required — the project `bot-discord-integration` Vitest project already supports `*.integration.test.ts` files.

**Primary recommendation:** Implement as three sequential tasks — (1) handler changes to `review-thread.ts` + `review-buttons.ts`, (2) `triggerAiReview` + `resubmitExercise` changes, (3) unit and integration tests covering all new branches.

---

## Standard Stack

### Core (already in project, no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord.js | 14.16.0 | `client.channels.fetch`, `ThreadChannel.setArchived`, `Message.edit` | Already installed; thread management API is complete |
| @assistme/core | workspace | `updateExercise`, `getExercise`, `resubmitExercise` | DB layer for all state mutations |
| vitest | (workspace root) | Unit + integration tests | Already configured with 5 projects; ESM-native |

### No new packages required

All functionality is covered by existing dependencies. The Discord.js APIs for thread management (`fetch`, `setArchived`, `messages.fetch`, `message.edit`) are available in v14 — HIGH confidence from reading the existing codebase which already uses `setArchived(true)` in `review-buttons.ts` line 186 and `thread.send` throughout.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure (files touched in this phase)

```
packages/
├── bot-discord/src/
│   ├── handlers/
│   │   ├── review-buttons.ts               ← handleReviewOpen: idempotency + thread reuse
│   │   ├── review-buttons.test.ts          ← extend with 4 new unit tests
│   │   └── dm-handler.ts                   ← triggerAiReview: edit thread AI message
│   └── utils/
│       ├── review-thread.ts                ← return {threadId, aiMessageId}; unarchive path
│       └── review-thread.test.ts           ← NEW: unit tests for createReviewThread behavior
└── core/src/
    └── db/formation/
        ├── exercises.ts                    ← resubmitExercise: preserve review_thread_id
        └── exercises.integration.test.ts   ← extend with thread ID persistence tests
```

### Pattern 1: Store-then-edit (notification_message_id analogy)

This is the established project pattern for "post a Discord message, store its ID, edit it later."

**What:** Post message → capture returned `Message` object → store `.id` in DB → later fetch and edit by ID.

**Existing usage:** `notification_message_id` written in `dm-handler.ts::notifyAdminChannel`, edited in `event-dispatcher.ts` lines 88-103 and `review-buttons.ts` lines 158-173.

**New application for ADM-03:**
```typescript
// In createReviewThread() — after posting AI placeholder:
const aiMsg = await thread.send('🤖 **Review IA :** en cours...');
await updateExercise(exercise.id, {
  review_thread_id: thread.id,
  review_thread_ai_message_id: aiMsg.id,
});
return { threadId: thread.id, aiMessageId: aiMsg.id };

// In triggerAiReview() — after saving AI review to DB:
const fresh = await getExercise(exerciseId);
if (fresh?.review_thread_id && fresh?.review_thread_ai_message_id) {
  try {
    const thread = await client.channels.fetch(fresh.review_thread_id);
    if (thread?.isThread()) {
      const aiMsg = await thread.messages.fetch(fresh.review_thread_ai_message_id);
      await aiMsg.edit(formattedAiReview);
    }
  } catch (err) {
    logger.warn({ err, exerciseId }, 'Could not edit thread AI message');
  }
}
```

**Note:** `triggerAiReview` in `dm-handler.ts` does not currently have access to the Discord `client`. The `discordClient` module-level variable is set in `setupDmHandler`. It is already in scope — used via `discordClient` in `notifyAdminChannel`. Use the same variable.

### Pattern 2: Idempotency via DB read-before-act

**What:** Before creating a Discord resource, read DB for an existing ID. Fetch the resource. If found, no-op (return existing). If not found (null or deleted), create fresh and persist ID.

**Applied to ADM-02 in `handleReviewOpen`:**
```typescript
// In handleReviewOpen — after loading exercise:
if (exercise.review_thread_id) {
  const existingThread = await interaction.client.channels.fetch(exercise.review_thread_id).catch(() => null);
  if (existingThread) {
    await interaction.editReply({
      content: `📝 Thread de review existant : <#${existingThread.id}>`,
    });
    return; // no-op
  }
  // Thread deleted — fall through to create new one
}
// ... create thread, store ID
```

### Pattern 3: Thread reuse on re-submission (ADM-01)

**What:** `createReviewThread` gains a new code path: if `exercise.review_thread_id` is set and the thread exists, call `setArchived(false)`, post a separator message, then post new submission content + fresh placeholder (skip thread creation). If `setArchived(false)` fails, fall through to create a new thread.

**Separator message format (Claude's discretion — recommended):**
```
--- Re-soumission #2 — 27/03/2026 15:42 ---
```
Includes `submission_count` and `new Date().toLocaleString('fr-FR', { timeZone: 'Asia/Bangkok' })`.

**createReviewThread signature change:**
```typescript
export async function createReviewThread(
  adminChannel: TextChannel,
  exercise: StudentExercise,
  student: Student,
  session: Session | null,
  client: Client,  // NEW: needed for channel fetch
): Promise<{ threadId: string; aiMessageId: string }>
```

The `client` is available in `review-buttons.ts` via `interaction.client`.

### Pattern 4: resubmitExercise preserves review_thread_id

Current `resubmitExercise` (line 316) explicitly sets `notification_message_id: null`. It must NOT set `review_thread_id: null`. It SHOULD set `review_thread_ai_message_id: null` because the new re-submission will get a new placeholder message.

```typescript
// In resubmitExercise update object:
{
  status: 'submitted',
  submitted_at: new Date().toISOString(),
  ai_review: null,
  feedback: null,
  reviewed_at: null,
  submission_url: params.submission_url,
  submission_type: params.submission_type,
  submission_count: exercise.submission_count + 1,
  review_history: updatedHistory,
  notification_message_id: null,
  review_thread_ai_message_id: null,  // NEW: clear so fresh placeholder gets new ID
  // review_thread_id: intentionally NOT cleared
}
```

### Anti-Patterns to Avoid

- **Clearing review_thread_id on re-submission:** Breaks thread reuse. The DB already has the correct schema; just don't overwrite it.
- **Awaiting triggerAiReview edit from event-dispatcher:** D-07 locks this — the thread message edit is direct in `triggerAiReview`, not via event queue. Mixing the two patterns would cause double-edit attempts.
- **Fetching thread with `interaction.guild.channels.cache.get(threadId)`:** Threads are not always in the guild channel cache. Use `client.channels.fetch(threadId)` which performs an API call. Already established as the correct approach per D-01.
- **Calling createReviewThread without updating caller:** The current return type is `Promise<void>`. Changing it to return `{ threadId, aiMessageId }` means `handleReviewOpen` must be updated to store the result. The mock in `review-buttons.test.ts` line 201 (`mockCreateReviewThread.mockResolvedValue(undefined)`) must be updated to return `{ threadId: 'thread-1', aiMessageId: 'msg-1' }`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Thread existence check | Custom cache lookup | `client.channels.fetch(id).catch(() => null)` | API-authoritative; cache can be stale after manual deletion |
| Thread unarchive | Poll + retry | `thread.setArchived(false)` | Single Discord.js API call; wrap in try-catch for error handling |
| Message in-place edit | Delete + repost | `message.edit(newContent)` | Edit preserves message ID (critical for idempotency key); repost loses the stored ID |
| DB idempotency key | UUIDs / timestamps | `review_thread_id` column (already in DB) | Columns already migrated and typed; no new infrastructure needed |

**Key insight:** All Discord.js API methods needed here (`setArchived`, `fetch`, `edit`, `send`) are already used elsewhere in the codebase. There is no novel Discord.js territory in this phase.

---

## Common Pitfalls

### Pitfall 1: `triggerAiReview` has no `client` reference — currently

**What goes wrong:** `triggerAiReview` is an `async function` inside `dm-handler.ts`. The module-level `discordClient: Client` variable is set in `setupDmHandler`. The function currently doesn't use `discordClient` directly — it only calls `createFormationEvent` (event-queue approach). For ADM-03, it needs to reach Discord to edit the thread message directly.

**Why it happens:** `triggerAiReview` was written before thread-message editing was in scope.

**How to avoid:** Use the existing `discordClient` module-level variable. It is already available in the same file — `notifyAdminChannel` on line 672 uses `discordClient.channels.cache.find(...)`. The same pattern applies here.

**Warning signs:** TypeScript error "Cannot find name 'discordClient'" inside `triggerAiReview` — means you scoped the variable incorrectly.

### Pitfall 2: `createReviewThread` mock in existing tests returns `undefined`

**What goes wrong:** After changing `createReviewThread` to return `Promise<{ threadId, aiMessageId }>`, the existing unit test mock at line 201 of `review-buttons.test.ts` still returns `undefined`. Tests that call `handleReviewOpen` will silently succeed but `updateExercise` will be called with `undefined` IDs.

**Why it happens:** Mock was written for the old void return type.

**How to avoid:** Update the mock at the top of `review-buttons.test.ts`:
```typescript
vi.mock('../utils/review-thread.js', () => ({
  createReviewThread: vi.fn().mockResolvedValue({ threadId: 'thread-1', aiMessageId: 'msg-1' }),
}));
```
Also update the `mockCreateReviewThread.mockResolvedValue(undefined)` line in `beforeEach`.

### Pitfall 3: `channels.fetch` throws vs returns null

**What goes wrong:** Discord.js `channels.fetch` throws `DiscordAPIError` with code `10003` (Unknown Channel) when the channel/thread is deleted — it does NOT return `null`. Using a simple null check after `await` will miss this.

**Why it happens:** Different Discord.js methods have different error-vs-null conventions.

**How to avoid:** Always wrap in `try-catch` and normalize to null:
```typescript
const thread = await client.channels.fetch(threadId).catch(() => null);
if (!thread) { /* create new */ }
```
The `catch(() => null)` pattern converts any error into null. Used consistently in `dm-handler.ts` (e.g., lines 315-347 use `.catch(async (err) => ...)`).

### Pitfall 4: `setArchived(false)` on a thread from a different guild

**What goes wrong:** `client.channels.fetch(threadId)` returns a `ThreadChannel` but `setArchived` fails with a permissions error if the bot's token doesn't have `MANAGE_THREADS` in that guild (or the thread is in a different guild in a multi-guild setup).

**Why it happens:** Permissions edge case; thread can be fetched but not modified.

**How to avoid:** Wrap `setArchived(false)` in `try-catch`. On failure, fall through to new thread creation (D-02 fallback behavior applies here too). Log at `warn` level, same pattern as `setArchived(true)` in `review-buttons.ts` line 185-188.

### Pitfall 5: Integration test cleanup order for review_thread_id tests

**What goes wrong:** Integration tests for `resubmitExercise` that verify `review_thread_id` persistence fail because the unique index `uq_student_exercise_active` prevents creating two 'submitted' records for the same student+session.

**Why it happens:** The partial unique index only permits one active submission per (student_id, session_id). Re-submission works correctly via `resubmitExercise` (which sets status to 'submitted' on the existing record — no new record), but test setups that insert two records directly will hit the constraint.

**How to avoid:** In integration tests for re-submission, use `resubmitExercise()` on the existing record (correct flow) rather than inserting a second record directly. The existing integration test pattern already does this correctly for the submission-count tests.

---

## Code Examples

### createReviewThread — new return type and thread reuse path

```typescript
// Source: review-thread.ts — synthesis from CONTEXT.md D-01, D-02, D-05
export async function createReviewThread(
  adminChannel: TextChannel,
  exercise: StudentExercise,
  student: Student,
  session: Session | null,
  client: Client,
): Promise<{ threadId: string; aiMessageId: string }> {
  // --- Thread reuse path (re-submission) ---
  if (exercise.review_thread_id) {
    const existingThread = await client.channels.fetch(exercise.review_thread_id).catch(() => null);
    if (existingThread?.isThread()) {
      try {
        await existingThread.setArchived(false);
      } catch (err) {
        logger.warn({ err, exerciseId: exercise.id }, 'Could not unarchive thread — creating new');
        // Fall through to new thread creation below
        return createNewThread(adminChannel, exercise, student, session);
      }
      // Post separator
      const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Asia/Bangkok' });
      await existingThread.send(`--- Re-soumission #${exercise.submission_count} — ${ts} ---`);
      // Post new submission content + placeholder
      const attachmentsWithUrls = await getSignedUrlsForExercise(exercise.id);
      const { submissionMsg, imageUrl } = formatReviewThreadMessages(exercise, session, student.name, attachmentsWithUrls);
      if (imageUrl) {
        const imageEmbed = new EmbedBuilder().setImage(imageUrl);
        await existingThread.send({ content: submissionMsg, embeds: [imageEmbed] });
      } else {
        await existingThread.send(submissionMsg);
      }
      const aiMsg = await existingThread.send('🤖 **Review IA :** en cours...');
      await updateExercise(exercise.id, { review_thread_ai_message_id: aiMsg.id });
      return { threadId: existingThread.id, aiMessageId: aiMsg.id };
    }
    // Thread was deleted — fall through to new thread creation
  }
  return createNewThread(adminChannel, exercise, student, session);
}
```

### handleReviewOpen — idempotency check

```typescript
// Source: review-buttons.ts — synthesis from CONTEXT.md D-03, D-04
async function handleReviewOpen(interaction: ButtonInteraction): Promise<void> {
  const exerciseId = interaction.customId.replace('review_open_', '');
  await interaction.deferReply({ ephemeral: true });

  const exercise = await getExercise(exerciseId);
  if (!exercise) {
    await interaction.editReply({ content: 'Exercice non trouve.' }); return;
  }
  if (exercise.status !== 'submitted' && exercise.status !== 'ai_reviewed') {
    await interaction.editReply({ content: `Exercice deja traite (${exercise.status}).` }); return;
  }

  // Idempotency: if thread already exists, return link
  if (exercise.review_thread_id) {
    const existing = await interaction.client.channels.fetch(exercise.review_thread_id).catch(() => null);
    if (existing) {
      await interaction.editReply({ content: `📝 Thread de review existant : <#${existing.id}>` });
      return;
    }
    // Thread deleted — proceed to create new
  }

  const student = await getStudent(exercise.student_id);
  if (!student) { await interaction.editReply({ content: 'Etudiant non trouve.' }); return; }

  const session = exercise.session_id ? await getSession(exercise.session_id) : null;
  const adminChannel = interaction.guild?.channels.cache.find(
    (ch) => ch.name === CHANNELS.admin && ch instanceof TextChannel
  ) as TextChannel | undefined;
  if (!adminChannel) { await interaction.editReply({ content: 'Canal admin non trouve.' }); return; }

  const { threadId, aiMessageId } = await createReviewThread(
    adminChannel, exercise, student, session, interaction.client
  );
  await updateExercise(exerciseId, { review_thread_id: threadId, review_thread_ai_message_id: aiMessageId });

  await interaction.editReply({ content: '📝 Thread de review cree.' });
}
```

### triggerAiReview — thread message edit

```typescript
// Source: dm-handler.ts — synthesis from CONTEXT.md D-06
// Add after line 192 (after updateExercise saves ai_review + status:'ai_reviewed'):
const freshExercise = await getExercise(exerciseId);
if (freshExercise?.review_thread_id && freshExercise?.review_thread_ai_message_id) {
  try {
    const thread = await discordClient.channels.fetch(freshExercise.review_thread_id).catch(() => null);
    if (thread?.isThread()) {
      const aiMsg = await thread.messages.fetch(freshExercise.review_thread_ai_message_id).catch(() => null);
      if (aiMsg) {
        // Format AI review (same formatter used in formatReviewThreadMessages)
        const aiText = formatAiReviewMessage(result); // extract from format.ts
        await aiMsg.edit(aiText);
        logger.info({ exerciseId }, 'Thread AI message updated in place');
      }
    }
  } catch (err) {
    logger.warn({ err, exerciseId }, 'Could not update thread AI message — non-blocking');
  }
}
```

### Unit test additions for review-buttons.test.ts

```typescript
// New test: review_open_ returns thread link when review_thread_id already set + thread exists
it('review_open_ returns existing thread link when review_thread_id is set and thread exists', async () => {
  const exercise = createExercise({ id: 'ex-1', status: 'submitted', review_thread_id: 'existing-thread-1' });
  mockGetExercise.mockResolvedValue(exercise);

  const mockThread = { id: 'existing-thread-1', isThread: () => false }; // channels.fetch returns non-null
  const interaction = new ButtonInteractionBuilder()
    .withCustomId('review_open_ex-1')
    .withGuild(makeGuildWithAdminChannel())
    .build();
  // Mock client.channels.fetch to return existing thread
  (interaction.client as unknown as Record<string, unknown>).channels = {
    fetch: vi.fn().mockResolvedValue(mockThread),
  };

  await invokeButton('review_open_', interaction);

  expect(interaction.editReply).toHaveBeenCalledWith(
    expect.objectContaining({ content: expect.stringContaining('existing-thread-1') })
  );
  expect(mockCreateReviewThread).not.toHaveBeenCalled();
});

// New test: review_open_ creates new thread when review_thread_id set but thread deleted
it('review_open_ creates new thread when stored thread no longer exists (deleted)', async () => {
  const exercise = createExercise({ id: 'ex-2', status: 'submitted', review_thread_id: 'deleted-thread' });
  mockGetExercise.mockResolvedValue(exercise);
  mockGetStudent.mockResolvedValue(createStudent({ id: 'student-1' }));
  mockGetSession.mockResolvedValue(createSession());

  const interaction = new ButtonInteractionBuilder()
    .withCustomId('review_open_ex-2')
    .withGuild(makeGuildWithAdminChannel())
    .build();
  (interaction.client as unknown as Record<string, unknown>).channels = {
    fetch: vi.fn().mockRejectedValue(new Error('Unknown Channel')), // simulates deleted thread
  };

  await invokeButton('review_open_', interaction);

  expect(mockCreateReviewThread).toHaveBeenCalledOnce();
});
```

### Integration test additions for exercises.integration.test.ts

```typescript
// Test: resubmitExercise preserves review_thread_id but clears review_thread_ai_message_id
it('resubmitExercise preserves review_thread_id and clears review_thread_ai_message_id', async () => {
  // Insert exercise with review_thread_id set
  const ex = await submitExercise({ student_id: studentId1, session_id: sessionId, ... });
  await updateExercise(ex.id, {
    review_thread_id: 'thread-abc',
    review_thread_ai_message_id: 'msg-xyz',
  });

  // Manually set to revision_needed so resubmit is valid
  await adminDb.from('student_exercises').update({ status: 'revision_needed' }).eq('id', ex.id);

  const resubmitted = await resubmitExercise(ex.id, { submission_url: null, submission_type: 'file' });

  expect(resubmitted.review_thread_id).toBe('thread-abc');      // preserved
  expect(resubmitted.review_thread_ai_message_id).toBeNull();   // cleared
  expect(resubmitted.notification_message_id).toBeNull();       // existing behavior
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `createReviewThread` returns void | Returns `{ threadId, aiMessageId }` | Caller can persist IDs for idempotency and in-place edit |
| `handleReviewOpen` always creates new thread | Check DB first, no-op if exists | Prevents double-click duplicates |
| `triggerAiReview` only fires event-dispatcher | Also directly edits thread message | Thread shows live result without next event-dispatcher cycle (2-min wait eliminated) |
| `resubmitExercise` clears notification_message_id only | Also clears `review_thread_ai_message_id` | New re-submission gets fresh placeholder message ID |
| `review-thread.ts` always creates new thread | Checks `review_thread_id`, reuses existing | Formateur sees complete audit trail in one thread |

**Deprecated/outdated:**
- `createReviewThread` void return: replaced with `{ threadId, aiMessageId }`. All callers must be updated (currently only `handleReviewOpen` in `review-buttons.ts`).

---

## Open Questions

1. **formatAiReviewMessage extraction**
   - What we know: `formatReviewThreadMessages` in `format.ts` builds the `aiReviewMsg` string. It is called in `createReviewThread` when the exercise already has `ai_review`.
   - What's unclear: Whether to extract a standalone `formatAiReviewMessage(review)` helper or inline the formatting in `triggerAiReview`.
   - Recommendation: Reuse `formatReviewThreadMessages` — call it with the updated exercise (fetched fresh after AI review save). Extract `aiReviewMsg` from the result. Avoids duplicating format logic.

2. **notifyAdminChannel vs createReviewThread call order race**
   - What we know: After `executeSubmission`, both `triggerAiReview` (fire-and-forget) and `notifyAdminChannel` (fire-and-forget) fire simultaneously. `triggerAiReview` may complete and try to edit a thread message that doesn't exist yet (thread only exists if admin clicks "Ouvrir review").
   - What's unclear: Whether this creates a false `warn` log on first submission.
   - Recommendation: This is handled by D-06 — if `review_thread_ai_message_id` is null (admin hasn't opened review yet), `triggerAiReview` does nothing. The warn log only fires if the DB has a message ID but the Discord fetch fails. No code change needed; document in comments.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test runner, all code | Yes | v24.14.0 | — |
| pnpm | Workspace commands | Yes | 10.32.1 | — |
| supabase CLI | Integration test globalSetup (`supabase start`, `db reset`) | Yes | 2.75.0 | — |
| Discord.js v14 | Thread management APIs | Yes (in node_modules) | 14.16.0 | — |
| Vitest (workspace) | `pnpm test:unit`, `pnpm test:integration` | Yes (in root package.json) | workspace | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Project Constraints (from CLAUDE.md)

- TypeScript strict mode, no `any`
- ESM imports with `.js` extension (e.g., `import { createReviewThread } from '../utils/review-thread.js'`)
- All Supabase queries go through `packages/core/src/db/` — no direct `getSupabase()` calls in handlers
- Run `pnpm test:unit` before committing any code change; never use `--no-verify`
- Spec-first: read `specs/04-bot-discord/SPEC.md` before modifying bot-discord code
- Named exports preferred, no default exports
- Action-verb prefix for DB functions: existing `updateExercise`, `resubmitExercise`, `getExercise`
- Error handling: explicit try-catch with `logger.warn` for non-critical Discord API failures
- No silent catches — always log

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `packages/bot-discord/src/handlers/review-buttons.ts` — existing `setArchived`, `channels.cache.find`, `messages.fetch` patterns
- Direct codebase read: `packages/bot-discord/src/utils/review-thread.ts` — current `createReviewThread` implementation
- Direct codebase read: `packages/bot-discord/src/handlers/dm-handler.ts` lines 158-205 — `triggerAiReview` implementation and `discordClient` module variable
- Direct codebase read: `packages/core/src/db/formation/exercises.ts` — `resubmitExercise` line 316 (`notification_message_id: null`)
- Direct codebase read: `packages/core/src/types/index.ts` lines 111-112 — `review_thread_id` and `review_thread_ai_message_id` confirmed in `StudentExercise`
- Direct codebase read: `supabase/migrations/017_exercise_submission_v2.sql` — both columns confirmed as `ADD COLUMN IF NOT EXISTS TEXT`
- Direct codebase read: `packages/bot-discord/src/handlers/review-buttons.test.ts` — mock patterns, `ButtonInteractionBuilder` usage, `registeredHandlers` capture approach
- Direct codebase read: `packages/core/src/db/formation/exercises.integration.test.ts` — integration test fixture pattern (beforeAll inserts, afterAll cleanup)
- Direct codebase read: `vitest.config.ts` — `bot-discord-integration` project configured for `*.integration.test.ts`; globalSetup confirmed

### Secondary (MEDIUM confidence)
- `packages/bot-discord/src/__mocks__/fixtures/domain/exercise.ts` — `createExercise` fixture already defaults `review_thread_id: null` and `review_thread_ai_message_id: null`
- `packages/bot-discord/src/__mocks__/discord/builders.ts` — `ButtonInteractionBuilder` supports `withChannel`, `withGuild`, `withClientUserId`; no built-in `client.channels.fetch` mock (must be added per-test)
- `test/integration-helpers.ts` — `createTestClient`, `createTestRunId`, `cleanupTestData` utilities confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and in use
- Architecture: HIGH — all patterns derived from direct codebase reading, not inference
- Pitfalls: HIGH — all pitfalls derived from reading actual code paths and test mocks
- Test strategy: HIGH — existing test infrastructure fully matches phase needs

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase, no fast-moving dependencies)
