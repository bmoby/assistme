# Technology Stack: Exercise Submission Flow Improvements

**Project:** Exercise Submission Flow — Bot Discord v2.0
**Researched:** 2026-03-25
**Domain:** Discord.js v14 interaction APIs + Supabase constraint patterns for multi-message accumulation, preview/confirm UI, uniqueness enforcement, re-submission logic, and admin review UX.

---

## Verdict: No New Dependencies Required

All required capabilities are already present in `discord.js 14.16.0` (installed) and `@supabase/supabase-js 2.49.1` (installed). This milestone is a **code addition** milestone, not a **dependency addition** milestone.

**Confidence: HIGH** — Verified against discord.js 14.16.3 class reference, Supabase JS reference, and existing codebase imports.

---

## Discord.js APIs Required (All Available in 14.16.0)

### 1. Message Component Collector — Preview/Confirm UI

**Purpose:** After accumulating messages, send a preview embed to the student's DM with Confirm/Cancel buttons, then await their click.

**API:** `Message.createMessageComponentCollector(options)` and `Message.awaitMessageComponent(options)`.

These methods exist on `Message` objects in DMChannel context. `awaitMessageComponent` is the right choice here — it awaits a single interaction (the confirm or cancel click) and rejects on timeout.

```typescript
import { ComponentType } from 'discord.js';

// Send preview to student DM
const previewMsg = await dmChannel.send({ embeds: [previewEmbed], components: [confirmRow] });

// Wait for student to click Confirm or Cancel (90s timeout)
try {
  const btnInteraction = await previewMsg.awaitMessageComponent({
    filter: (i) => i.user.id === discordUserId,
    componentType: ComponentType.Button,
    time: 90_000,
  });
  await btnInteraction.deferUpdate(); // Acknowledge within Discord's 3-second deadline
  // btnInteraction.customId will be 'confirm_submit' or 'cancel_submit'
} catch {
  // Timeout — user did not respond within 90 seconds
  await previewMsg.edit({ content: 'Время истекло. Отправь заново.', embeds: [], components: [] });
}
```

**Key constraint:** Discord requires ALL interactions to be acknowledged within 3 seconds. Call `btnInteraction.deferUpdate()` or `btnInteraction.update()` immediately in the handler — before any DB calls.

**Confidence: HIGH** — `awaitMessageComponent` is documented on `DMChannel` and `Message` in discord.js 14.x official docs. The `componentType: ComponentType.Button` enum (not the string `'BUTTON'`) is the v14 pattern.

---

### 2. EmbedBuilder — Submission Preview

**Purpose:** Build the preview embed shown to the student before they confirm the submission.

**API:** `EmbedBuilder` (already imported in `dm-handler.ts` indirectly via `format.ts` and `review-thread.ts`). Already used extensively in `packages/bot-discord/src/utils/format.ts`.

```typescript
import { EmbedBuilder } from 'discord.js';

function buildPreviewEmbed(
  sessionTitle: string,
  textContent: string | null,
  attachmentSummary: string[],
  urlList: string[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Предпросмотр задания')
    .setDescription('Проверь перед отправкой:')
    .setColor(0x5865f2);

  if (textContent) embed.addFields({ name: 'Текст', value: textContent.slice(0, 1024) });
  if (attachmentSummary.length > 0) {
    embed.addFields({ name: 'Файлы', value: attachmentSummary.join('\n').slice(0, 1024) });
  }
  if (urlList.length > 0) {
    embed.addFields({ name: 'Ссылки', value: urlList.join('\n').slice(0, 1024) });
  }
  embed.addFields({ name: 'Сессия', value: sessionTitle });
  return embed;
}
```

**Confidence: HIGH** — Already used in project. No changes needed.

---

### 3. ActionRowBuilder + ButtonBuilder — Confirm/Cancel Row

**Purpose:** Attach Confirm and Cancel buttons to the preview message.

**API:** `ActionRowBuilder<ButtonBuilder>` with `ButtonStyle.Success` (confirm) and `ButtonStyle.Secondary` (cancel). Already imported and used in `dm-handler.ts` and `review-buttons.ts`.

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId('confirm_submit')
    .setLabel('Отправить')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId('cancel_submit')
    .setLabel('Отмена')
    .setStyle(ButtonStyle.Secondary),
);
```

**Confidence: HIGH** — Exact same pattern already used in the codebase.

---

### 4. ButtonInteraction.deferUpdate / .update — Interaction Acknowledgement

**Purpose:** Acknowledge the student's button click within Discord's 3-second deadline before performing async DB operations.

**API:** Two methods on `ButtonInteraction`:

- `interaction.deferUpdate()` — Acknowledges interaction, keeps the original message intact. Use when you will edit the message after async work.
- `interaction.update({ content, embeds, components })` — Acknowledges and immediately edits the original message in one call. Use when the edit is fast/synchronous.

For the confirm flow (which triggers DB writes and file uploads), use `deferUpdate()` first, then `previewMsg.edit(...)` after the async work completes.

```typescript
await btnInteraction.deferUpdate();
// ... do async work (DB, file uploads) ...
await previewMsg.edit({ content: 'Задание отправлено!', embeds: [], components: [] });
```

**Confidence: HIGH** — Standard discord.js v14 interaction pattern. `deferUpdate` is available on `ButtonInteraction` in v14.

---

### 5. ThreadChannel APIs — Admin Review UX

**Purpose:** The admin review UX improvements (re-opening closed threads, finding existing threads by name) require the `ThreadChannel` API.

These are already used in `review-thread.ts`. The specific additions needed for "re-ouverture facile":

**Find existing thread before creating a new one:**

```typescript
// Check if a review thread already exists for this exercise (avoid duplicates)
const existingThread = adminChannel.threads.cache.find(
  (t) => t.name.startsWith(`Review: ${student.name}`) && !t.archived
);

// Unarchive if needed (e.g., student re-submitted, thread was archived)
if (existingThread?.archived) {
  await existingThread.setArchived(false);
}
```

**`setArchived(bool)` signature:**
```typescript
thread.setArchived(archived: boolean, reason?: string): Promise<ThreadChannel>
```

**`threads.create` options** (already used in `review-thread.ts`):
```typescript
adminChannel.threads.create({
  name: threadName.slice(0, 100),  // Discord hard limit: 100 chars
  autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,  // enum from discord.js
})
```

**Available `ThreadAutoArchiveDuration` enum values:**
- `ThreadAutoArchiveDuration.OneHour` = 60
- `ThreadAutoArchiveDuration.OneDay` = 1440
- `ThreadAutoArchiveDuration.ThreeDays` = 4320
- `ThreadAutoArchiveDuration.OneWeek` = 10080

**`thread.messages.fetch({ limit: 100 })`** — already used in `review-buttons.ts` to collect formateur feedback messages. No changes needed.

**Confidence: HIGH** — All these APIs are already used in the codebase. `setArchived` confirmed in ThreadChannel docs.

---

### 6. DMChannel.send / sendTyping — Already in Use

**Purpose:** Send preview message to student and show typing indicator during processing. Both already used in `dm-handler.ts`. No changes needed.

**Confidence: HIGH** — In use today.

---

## Supabase Patterns Required

### 1. Unique Constraint on (student_id, session_id)

**Purpose:** Enforce at the DB level that one student can have at most one exercise row per session. This is the "1 student = 1 submission per session" guarantee, currently enforced only in application logic (`dm-agent.ts` lines 340-348).

**Current state:** No unique constraint exists on `student_exercises(student_id, session_id)`. The application logic is the only guard. A DB-level constraint is the correct belt-and-suspenders approach.

**PostgreSQL pattern:** A `UNIQUE INDEX` (not just a `UNIQUE CONSTRAINT`) is required for Supabase's PostgREST `upsert` with `onConflict` to work correctly. PostgREST uses the index, not the constraint name.

```sql
-- Migration 017: unique constraint for 1 student per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_exercises_student_session
  ON student_exercises(student_id, session_id)
  WHERE session_id IS NOT NULL;
```

The `WHERE session_id IS NOT NULL` partial index is critical — existing rows with `session_id = NULL` (exercises submitted before session tracking was added) must not be affected.

**Confidence: HIGH** — PostgreSQL partial unique index behavior is standard and well-documented. The `WHERE session_id IS NOT NULL` guard is confirmed necessary by examining migration 001 (original schema had no `session_id`) and migration 005 (added `session_id` as nullable).

---

### 2. Upsert Pattern with onConflict

**Purpose:** The re-submission flow currently does a read-then-write (`resubmitExercise` fetches then updates). With the unique index in place, `upsert` is an alternative but is NOT recommended here.

**Why not upsert:** The re-submission logic requires:
1. Reading the current exercise to build the `review_history` JSONB append
2. Deleting old storage attachments
3. Updating with incremented `submission_count`

This is a multi-step operation that cannot be expressed as a single `upsert`. The existing `resubmitExercise` function in `exercises.ts` is the correct approach — keep it. The unique index adds DB-level protection without requiring a rewrite.

**Upsert is useful for the `getOrCreate` lookup pattern** — checking if an exercise exists for (student_id, session_id) before deciding to submit or resubmit:

```typescript
// Supabase JS v2 upsert with onConflict (for reference only)
const { data, error } = await db
  .from('student_exercises')
  .upsert(
    { student_id, session_id, status: 'submitted', ... },
    { onConflict: 'student_id,session_id', ignoreDuplicates: false }
  )
  .select()
  .single();
```

**But this is NOT the right pattern here.** The correct pattern is to query first, then branch on `submitExercise` vs `resubmitExercise`. Keep the existing application-level logic, add the DB-level unique index as a safety net only.

**Confidence: HIGH** — The read-then-write pattern is already implemented and working. The unique index adds protection; upsert is not needed.

---

### 3. getExerciseByStudentAndSession — New DB Function Needed

**Purpose:** The current code in `dm-agent.ts` calls `getExercisesByStudent(student.id)` (fetches ALL exercises for the student) and then filters in memory. With the new unique constraint, a targeted query is cleaner and more efficient.

**New function to add in `exercises.ts`:**

```typescript
export async function getExerciseByStudentAndSession(
  studentId: string,
  sessionId: string
): Promise<StudentExercise | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('student_exercises')
    .select()
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .maybeSingle(); // Returns null if not found, unlike .single() which throws

  if (error) {
    logger.error({ error, studentId, sessionId }, 'Failed to get exercise by student and session');
    throw error;
  }
  return data as StudentExercise | null;
}
```

**Key detail:** Use `.maybeSingle()` (not `.single()`). `.single()` throws a `PGRST116` error when no row is found. `.maybeSingle()` returns `null` cleanly. This is the correct pattern for "find or null" queries.

**Confidence: HIGH** — `.maybeSingle()` is confirmed in Supabase JS v2 docs. The pattern is the standard codebase approach (see `getExercise()` which handles `PGRST116` manually — `maybeSingle()` avoids that boilerplate).

---

### 4. Validation: Empty Submission Guard

**Purpose:** Reject submissions with no content (no text, no attachments, no URLs). This is application-layer logic, not a DB constraint.

The check belongs in the DM handler before calling `runDmAgent`, or inside `handleCreateSubmission` in `dm-agent.ts`:

```typescript
// In handleCreateSubmission, before any DB/storage calls:
const hasContent =
  pendingAttachments.length > 0 ||
  (studentComment && studentComment.trim().length > 0);

if (!hasContent) {
  return JSON.stringify({
    error: 'empty_submission',
    message: 'Нельзя отправить пустое задание. Добавь текст, файл или ссылку.',
  });
}
```

**Confidence: HIGH** — Pure application logic, no external APIs involved.

---

## What NOT to Add

| Considered | Decision | Reason |
|------------|----------|--------|
| New npm library for button collectors | Rejected | `discord.js` 14.16.0 already has `awaitMessageComponent` on `Message` |
| `discord-collector` or similar | Rejected | Unmaintained third-party wrapper, `discord.js` native API is sufficient |
| `pg` / `postgres.js` for raw SQL | Rejected | Supabase JS client handles all needed patterns; raw SQL only needed for migrations |
| `zod` schema for submission state | Not needed | TypeScript interfaces in `packages/core/src/types/index.ts` are sufficient; Zod already used at API boundaries |
| `bullmq` or similar for accumulation timeout | Rejected | In-memory `setTimeout` with existing `conversations` Map is sufficient; queue infrastructure would be massive overkill |
| Supabase `upsert` to replace `resubmitExercise` | Rejected | Multi-step re-submission (history append, file cleanup, count increment) cannot be expressed as single upsert |

---

## Summary: What Actually Changes

### New code in `packages/bot-discord/src/`

| File | Change |
|------|--------|
| `src/handlers/dm-handler.ts` | Add accumulation phase: collect session number + content over multiple messages, then trigger preview flow |
| `src/utils/submission-preview.ts` (new) | Build preview embed + confirm/cancel row; `awaitMessageComponent` loop; return confirm/cancel |
| `src/utils/format.ts` | Add `buildSubmissionPreviewEmbed()` function |

### New code in `packages/core/src/db/formation/`

| File | Change |
|------|--------|
| `exercises.ts` | Add `getExerciseByStudentAndSession()` using `.maybeSingle()` |

### New migration in `supabase/migrations/`

| File | Change |
|------|--------|
| `017_exercise_unique_per_session.sql` | `CREATE UNIQUE INDEX` on `(student_id, session_id) WHERE session_id IS NOT NULL` |

### No changes needed

| File | Reason |
|------|--------|
| `review-buttons.ts` | Thread APIs already correct |
| `review-thread.ts` | `createReviewThread` already handles re-submissions via `submission_count` |
| `button-handler.ts` | Prefix dispatch pattern already handles any new button IDs |
| `admin-handler.ts` | No changes needed for admin review UX improvements |

---

## Sources

- discord.js 14.16.3 DMChannel class reference: https://discordjs.dev/docs/packages/discord.js/14.16.3/DMChannel:Class
- discord.js 14.18.0 Message class (awaitMessageComponent): https://discord.js.org/docs/packages/discord.js/14.18.0/Message:class
- discord.js collectors guide: https://discordjs.guide/popular-topics/collectors
- discord.js v14 component interactions guide: https://discordjs.guide/interactive-components/interactions.html
- Supabase JS upsert reference: https://supabase.com/docs/reference/javascript/upsert
- Supabase composite unique constraint discussion: https://github.com/orgs/supabase/discussions/28927
- discord.js v14 ThreadChannel (14.16.3): https://discordjs.dev/docs/packages/discord.js/14.16.3/ThreadChannel:Class
- Interaction collector issues in v14 (DM context): https://github.com/discordjs/discord.js/issues/9866
