# Domain Pitfalls

**Domain:** Discord bot exercise submission flow — multi-message collection, unique constraints, re-submission, thread-based admin review (milestone v2.0); plus test infrastructure for the same bot (milestone v1.0)
**Researched:** 2026-03-25
**Confidence:** HIGH — all pitfalls verified against codebase source (dm-handler.ts, dm-agent.ts, review-buttons.ts, exercises.ts, migrations)

---

## Critical Pitfalls

Mistakes that cause data corruption, silent duplicate records, rewrites, or complete CI blockages.

---

### Pitfall 1: Button double-click creates two review threads — no idempotency guard

**What goes wrong:**
`handleReviewOpen` in `review-buttons.ts` calls `createReviewThread()` with no guard against being invoked twice for the same exercise. A formateur double-clicking, a slow network causing a retry, or two admins clicking simultaneously will create duplicate threads in #админ — both with functioning Approve/Revision buttons pointing to the same `exerciseId`.

**Why it happens:**
The function checks `exercise.status !== 'submitted' && exercise.status !== 'ai_reviewed'` before proceeding. But it does NOT write anything to the DB to indicate "a thread now exists". The check passes again identically on the second click. `adminChannel.threads.create()` is called twice.

**Consequences:**
- Two threads exist in #админ with the same exercise. Clicking Approve in either calls `updateExerciseStatus`, which succeeds the first time and shows "Exercice deja traite" on the second — but only after the thread was already created.
- `notification_message_id` is overwritten by the last call (last writer wins). Admin loses reference to the first notification.
- Admin confusion; no automated cleanup.

**Prevention:**
Add a `review_thread_id TEXT` column to `student_exercises`. Write it in `createReviewThread` before the `adminChannel.threads.create()` call. At the top of `handleReviewOpen`, check:
```typescript
if (exercise.review_thread_id) {
  await interaction.editReply({ content: 'Thread deja ouvert.' });
  return;
}
```
The `deferReply` call (which Discord deduplicates within the 3-second ack window) combined with the DB guard eliminates the race for all normal double-click scenarios. True concurrent admin clicks require a `SELECT ... FOR UPDATE` advisory lock at Postgres — evaluate whether that complexity is warranted given the team size (1 admin).

**Detection:** Two threads with identical names appearing in #админ within seconds. Logs: `Review thread created` with the same `exerciseId` twice.

**Phase to address:** Before implementing thread-creation UX improvements.

---

### Pitfall 2: No DB unique constraint on (student_id, session_id) — first-submission TOCTOU

**What goes wrong:**
`handleCreateSubmission` in `dm-agent.ts` does a read-then-write: calls `getExercisesByStudent`, checks for existing records, then calls `submitExercise` (INSERT). The per-user `processingLocks` in `dm-handler.ts` serialises messages from the same Discord user, but does NOT prevent:
- Two concurrent bot processes (brief window during deploy/restart) both passing the check
- A network timeout causing the client to retry while the first request is still in-flight
- A test environment that bypasses the lock

**Consequences:**
- Two rows in `student_exercises` with the same `student_id` + `session_id`.
- `handleGetSessionExercise` uses `exercises.find(e => e.session_id === session.id)` — first match wins, the duplicate is silently invisible but pollutes admin digests.
- `getPendingExercisesBySession` (used in `handleReviewSession`) returns both, showing the same student twice in the review list.
- The student receives two admin notifications for the same submission.

**Prevention:**
Migration (add before any handler changes):
```sql
CREATE UNIQUE INDEX idx_student_exercises_unique_session
  ON student_exercises(student_id, session_id)
  WHERE session_id IS NOT NULL;
```
Then update `submitExercise` to use upsert with `onConflict` or handle the unique violation error code `23505` explicitly and return the existing record instead of throwing.

**Detection:** Query: `SELECT student_id, session_id, COUNT(*) FROM student_exercises WHERE session_id IS NOT NULL GROUP BY student_id, session_id HAVING COUNT(*) > 1;`

**Phase to address:** DB migration phase — before any handler changes. This is a schema correctness fix, not an application-layer workaround.

---

### Pitfall 3: `session_id` is set via a separate bare UPDATE after INSERT — non-atomic

**What goes wrong:**
In `handleCreateSubmission` (dm-agent.ts lines 406-408), after `submitExercise` inserts the row, a raw `db.from('student_exercises').update({ session_id: session.id }).eq('id', exercise.id)` is executed as a separate call. If the process crashes or the Claude API times out between the INSERT and the UPDATE, the exercise record has `session_id = null` permanently.

**Why it happens:**
`submitExercise` predates session tracking (added in migration 005). The caller patches the field after the fact.

**Consequences:**
- An exercise with `session_id = null` is invisible to `getPendingExercisesBySession` and the admin digest.
- `handleGetSessionExercise` returns `already_submitted: false` even though a submission exists — student can submit again, creating a duplicate (compounding Pitfall 2).
- `handleGetStudentProgress` has a fallback matching on `module + exercise_number` that may or may not match, making progress tracking non-deterministic.

**Prevention:**
Add `session_id` to the INSERT payload inside `submitExercise`:
```typescript
export async function submitExercise(params: {
  student_id: string;
  session_id: string;       // add this
  module: number;
  exercise_number: number;
  submission_url: string;
  submission_type?: string;
}): Promise<StudentExercise>
```
This is a single DB round-trip and is atomic by definition. Delete the separate UPDATE call from `handleCreateSubmission`.

**Detection:** `SELECT id, session_id FROM student_exercises WHERE session_id IS NULL AND status != 'submitted';` — rows here were submitted but never linked to a session.

**Phase to address:** Core DB module refactor phase, before submission handler changes.

---

### Pitfall 4: `resubmitExercise` deletes old attachments before uploading new ones — no rollback path

**What goes wrong:**
The re-submission path in `handleCreateSubmission` executes:
1. `deleteAttachmentsByExercise` — removes DB rows.
2. `resubmitExercise` — marks exercise as `submitted`, clears `ai_review`, clears `feedback`.
3. Upload new files to Supabase Storage.
4. `addAttachment` for each new file.

If the process crashes or a network error occurs after step 2 but before step 4 completes, the exercise is marked `submitted` with zero attachments and zero recoverable content.

**Why it happens:**
There is no transaction spanning the re-submission sequence. Each step is an independent async call. Old-file deletion is intentionally fire-and-forget for storage, but the attachment record deletion (step 1) is synchronous and permanent.

**Consequences:**
- Exercise status is `submitted` but `getAttachmentsByExercise` returns an empty array.
- `createReviewThread` renders the student's submission with no content.
- `getSignedUrlsForExercise` returns an empty array; `formatReviewThreadMessages` renders nothing visible to the formateur.
- The original files are deleted; there is no recovery without Supabase Storage versioning.

**Prevention:**
Invert the order: upload new files first, create new attachment records, then update exercise status, then delete old records. The "expand then contract" pattern:
1. Upload new files to storage (new paths only).
2. Create new `submission_attachments` records.
3. Call `resubmitExercise` (status transition — the exercise now has both old + new attachments momentarily).
4. Delete old attachment records (fire-and-forget, safe to retry, no data loss if skipped).
5. Delete old storage files (fire-and-forget, storage cleanup cron will handle stragglers).

At no point is the exercise in a state with zero attachments when marked `submitted`.

**Detection:** `SELECT se.id FROM student_exercises se LEFT JOIN submission_attachments sa ON sa.exercise_id = se.id WHERE se.status = 'submitted' AND sa.id IS NULL;`

**Phase to address:** Re-submission implementation phase.

---

### Pitfall 5: Orphaned `pendingAttachments` after partial failure corrupts the next submission

**What goes wrong:**
`conv.pendingAttachments` is accumulated per-user across multiple messages. It is cleared in `dm-handler.ts` line 159 — only when `result.submissionId` is truthy (i.e., a successful submission occurred). All error paths (agent throw, Claude timeout, Supabase down) leave the accumulated attachments in place.

**Why it happens:**
The success path was designed first; error recovery was not designed with attachment accumulation in mind.

**Consequences:**
- After an error, the student's next message (e.g., "Попробуй ещё раз") triggers `runDmAgent` again with all the old attachments still in `pendingAttachments`. If the agent then calls `create_submission`, the student may submit for a session they never intended.
- Buffer memory leak: a 25 MB file buffer stays in `conv.pendingAttachments` until the 30-minute cleanup cycle (`cleanupConversations`).
- If the student intends to submit a *different* session next, the old session's attachments are silently included.

**Prevention:**
Clear `pendingAttachments` on all terminal error paths (not only on success). Add a distinct "submission flow" state machine to `ConversationState` so that a reset of the submission flow does not require wiping the full conversation history. Minimum viable fix:
```typescript
} catch (err) {
  logger.error({ err, userId }, 'DM agent error');
  conv.pendingAttachments = [];   // clear on error
  await message.reply('...');
}
```

**Detection:** Agent logs show `attachments: N` on a second attempt when the student sent no new files.

**Phase to address:** DM handler refactor, early in the milestone.

---

### Pitfall 6: `vi.mock('@assistme/core')` silently no-ops due to pnpm symlink split

**What goes wrong:**
`vi.mock('@assistme/core')` in `packages/bot-discord/src/__tests__/` may mock a different module instance than what the handler actually imports. The handler under test calls real Supabase-connected DB functions instead of stubs.

**Why it happens:**
pnpm installs workspace packages via symlinks (`node_modules/@assistme/core` → `packages/core/dist/`). Vitest resolves the module from the symlink target path — a different absolute path than what `vi.mock` registers the mock against. Documented in vitest-dev/vitest issue #5633.

**Consequences:**
- Handler tests make real DB calls, require real env vars, are not isolated.
- Tests pass locally (dist is fresh) but fail in CI (dist is stale or missing).

**Prevention:**
In `vitest.config.ts` for `bot-discord`, add:
```typescript
resolve: {
  alias: { '@assistme/core': path.resolve('../core/src/index.ts') }
}
```
This makes Vitest import source directly, bypassing stale dist and eliminating the symlink path split.

**Detection:** Mock is registered but `console.log` inside the real function still fires. Error: `Cannot read properties of undefined` on Supabase client (env vars missing in unit test env).

**Phase to address:** Phase 1 (Vitest configuration). Must be solved before any handler tests are written.

---

### Pitfall 7: `getSupabase()` singleton throws at test import time

**What goes wrong:**
`packages/core/src/db/client.ts` throws if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` env vars are missing. Any test file that imports a handler which transitively imports any DB function causes an immediate throw during module initialization — before the test even runs.

**Prevention:**
In `vitest.config.ts`, set:
```typescript
test: {
  env: {
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    ANTHROPIC_API_KEY: 'test-key',
  }
}
```
These fake values satisfy the guard without connecting to real services.

**Detection:** `Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` on the first test file run, before any `it()` block executes.

**Phase to address:** Phase 1 (Vitest configuration).

---

## Moderate Pitfalls

---

### Pitfall 8: `handleReviewDecision` uses a dynamic `import('@assistme/core')` inside a hot path

**What goes wrong:**
`review-buttons.ts` line 163:
```typescript
const attachments = await import('@assistme/core').then((m) => m.getAttachmentsByExercise(exerciseId));
```
This dynamic import is inside an async button handler. In test environments with `vi.mock('@assistme/core')`, this dynamic import bypasses the mock, causing test failures or accidentally hitting the real DB.

**Why it happens:**
`getAttachmentsByExercise` was added to this code path after the file's static imports were written and was not added to the top-level import statement.

**Prevention:**
Add `getAttachmentsByExercise` to the static imports at the top of `review-buttons.ts`. It is already exported from `@assistme/core`. Delete the dynamic import.

**Phase to address:** During review button refactor. Add a unit test for `handleReviewDecision` that asserts on `getAttachmentsByExercise` mock calls.

---

### Pitfall 9: `handleReviewSession` uses N+1 sequential student queries

**What goes wrong:**
```typescript
for (const ex of pending) {
  if (!studentNames.has(ex.student_id)) {
    const student = await getStudent(ex.student_id);
    ...
  }
}
```
For a 30-student cohort, this is up to 30 sequential Supabase round-trips before the admin sees the list. Each adds ~50–100ms network latency.

**Prevention:**
Collect unique `student_id` values, then batch-fetch with a single `.in('id', [...ids])` query. Add `getStudentsByIds(ids: string[]): Promise<Student[]>` to the students DB module.

**Phase to address:** Admin UX improvement phase.

---

### Pitfall 10: Discord interaction token expires in 15 minutes — long review handlers silently fail

**What goes wrong:**
Discord interaction tokens expire after 15 minutes. `handleReviewDecision` defers the reply then executes: DB fetch, `thread.messages.fetch({ limit: 100 })`, status update, DM send, notification message edit, thread archive — sequentially. Under Supabase slowness or a large thread, this can approach the limit. After expiry, `editReply` throws `DiscordAPIError[10062]: Unknown Interaction`.

**Prevention:**
Add a practical timeout guard. `thread.messages.fetch({ limit: 100 })` is the slowest step — put a `Promise.race` with a 12-minute deadline. Log a warning at 10 minutes. For threads with many messages, fetch only since thread creation timestamp rather than fetching all 100.

**Detection:** `DiscordAPIError[10062]` in logs. The DB update succeeds but the admin never sees confirmation and the thread is not archived.

**Phase to address:** Admin UX review phase, before production deploy.

---

### Pitfall 11: `storageIdx` counter misaligns if a non-URL attachment has `buffer === null`

**What goes wrong:**
In `handleCreateSubmission`, files are uploaded to storage and paths stored in `storagePaths[]`. A positional counter `storageIdx` maps attachment records to storage paths. If a `PendingAttachment` has `type !== 'url'` but `buffer === null` (e.g., due to a silent download failure that didn't terminate early), `uploadFileToStorage` is not called for that entry, `storagePaths` has fewer entries than expected, and `storageIdx` points to the wrong path for all subsequent attachments.

**Prevention:**
Use an index-keyed Map instead of a positional counter:
```typescript
const storagePaths = new Map<number, string>();
for (let i = 0; i < pendingAttachments.length; i++) {
  const att = pendingAttachments[i];
  if (att.buffer && att.type !== 'url') {
    storagePaths.set(i, await uploadFileToStorage(...));
  }
}
```
Then when creating attachment records, look up `storagePaths.get(i)` by attachment index.

**Phase to address:** Submission handler hardening phase.

---

### Pitfall 12: Thread name duplicate for same student across re-submissions

**What goes wrong:**
`createReviewThread` builds the thread name as `Review: ${student.name} — ${sessionLabel}${countLabel}` and truncates to 100 characters. Discord allows duplicate thread names. For a student submitting session 3 twice, thread names are:
- `Review: Ali — Session 3`
- `Review: Ali — Session 3 (#2)`

These are distinct. But if the student name is long enough to push the count label off at 100 chars, both threads get the same truncated name.

**Prevention:**
Append the first 8 characters of `exercise.id` to guarantee uniqueness within the thread name budget:
```typescript
const threadName = `Review: ${student.name} — ${sessionLabel}${countLabel} [${exercise.id.slice(0, 8)}]`.slice(0, 100);
```

**Phase to address:** Thread creation utility refactor (low priority).

---

### Pitfall 13: Signed URLs in review thread expire after 7 days

**What goes wrong:**
`getSignedUrlsForExercise` uses `expiresIn = 604800` (7 days). Review thread images and file links expire one week after thread creation. An admin re-opening an archived thread to reference past work sees broken embeds.

**Prevention:**
For the review thread use case, either: (a) generate fresh signed URLs when `handleReviewOpen` is called (not at thread-creation time), or (b) store `storage_path` in the thread message and re-generate on demand. Option (a) is simpler: pass `attachmentsWithUrls` as a parameter sourced from a fresh `getSignedUrlsForExercise` call each time the thread is opened.

**Phase to address:** Thread creation polish phase.

---

### Pitfall 14: In-memory `conversations` Map leaks between tests

**What goes wrong:**
`dm-handler.ts` maintains module-level `conversations: Map<string, ConversationState>` and `processingLocks: Map<string, Promise<void>>`. Because ESM modules are cached, these Maps persist across all tests in the same Vitest worker. A test that simulates a DM conversation leaves state that corrupts the next test.

**Prevention:**
Call `_clearStateForTesting()` (already exported) in `beforeEach` for all `dm-handler` tests. Add a comment to the export noting it must be called in `beforeEach`, not `afterEach`, to ensure clean state even if a previous test throws.

**Detection:** Second test in a file receives conversation history from the first test. `processDmMessage` behaves differently depending on test execution order.

**Phase to address:** Phase 2 (Unit tests). Call `_clearStateForTesting()` in `beforeEach` from the start.

---

### Pitfall 15: Supabase Docker pull takes 3–5 minutes in CI, blocking every PR

**What goes wrong:**
`supabase start` on a fresh GitHub Actions runner downloads 6+ Docker images sequentially. On ephemeral standard runners, this repeats on every run.

**Prevention:**
Split CI jobs: unit tests (no Docker) run first and fast; integration tests (with Supabase) run as a separate job, gated on `!isPullRequestFromFork`. Unit and agent tests that mock DB calls must not require Docker at all — enforce this with a CI lint rule: "unit test jobs must not have `SUPABASE_URL` set".

**Phase to address:** Phase 3 (CI setup).

---

### Pitfall 16: Discord E2E tests silently run in CI without secrets — all pass vacuously

**What goes wrong:**
If E2E tests are included in the default `pnpm test` run and `DISCORD_BOT_TOKEN` is absent, the guard `if (!process.env.DISCORD_BOT_TOKEN) { test.skip(...) }` skips the tests silently — CI exits 0 with no meaningful signal.

**Prevention:**
Use a separate `vitest.e2e.config.ts` invoked only via `pnpm test:e2e`. Add a CI job that runs E2E only on protected branches where secrets are available. Distinguish "skipped because no token" from "passing" in the CI output.

**Phase to address:** Phase 3 (CI setup) and Phase 4 (E2E tests).

---

## Phase-Specific Warnings

| Phase Topic | Pitfall | Mitigation |
|---|---|---|
| DB migration: unique constraint | Pitfall 2 (TOCTOU duplicate rows) | `UNIQUE INDEX` on `(student_id, session_id)` before any handler changes |
| DB migration: session_id atomicity | Pitfall 3 (non-atomic session_id) | Fold `session_id` into `submitExercise` INSERT |
| Multi-message accumulation | Pitfall 5 (orphaned attachments on error) | Clear `pendingAttachments` on all error paths |
| Re-submission logic | Pitfall 4 (delete-before-upload) | Upload new files first; delete old ones last |
| Thread creation UX | Pitfall 1 (duplicate threads) | Write `review_thread_id` to DB before `threads.create()` |
| Thread creation UX | Pitfall 12 (name collision) | Append exercise ID prefix |
| Thread creation UX | Pitfall 13 (7-day URL expiry) | Generate signed URLs on `handleReviewOpen`, not at creation time |
| Admin review UX | Pitfall 8 (dynamic import bypasses mock) | Replace with static import; add unit test |
| Admin review UX | Pitfall 9 (N+1 student queries) | Batch-fetch with `.in()` |
| Admin review UX | Pitfall 10 (interaction token 15-min expiry) | `Promise.race` with 12-minute deadline |
| Submission handler hardening | Pitfall 11 (storageIdx misalignment) | Use index-keyed Map |
| Phase 1: Vitest config | Pitfall 6 (symlink mock split) | `resolve.alias` to source in vitest.config.ts |
| Phase 1: Vitest config | Pitfall 7 (env var throw at import) | Set fake env in `test.env` immediately |
| Phase 2: Unit tests | Pitfall 14 (Map state leak between tests) | Call `_clearStateForTesting()` in `beforeEach` |
| Phase 3: CI setup | Pitfall 15 (Supabase Docker pull in CI) | Gate integration tests to a separate job |
| Phase 3–4: E2E | Pitfall 16 (silent E2E skip in CI) | Separate `vitest.e2e.config.ts` |

---

## Sources

- Codebase direct inspection:
  - `packages/bot-discord/src/handlers/dm-handler.ts`
  - `packages/bot-discord/src/handlers/review-buttons.ts`
  - `packages/bot-discord/src/utils/review-thread.ts`
  - `packages/core/src/ai/formation/dm-agent.ts`
  - `packages/core/src/db/formation/exercises.ts`
  - `packages/core/src/db/formation/attachments.ts`
  - `supabase/migrations/004_students_system.sql`, `005_sessions_system.sql`, `016_exercise_review_system.sql`
- Discord.js interaction acknowledgement issues: [GitHub issue #9052](https://github.com/discordjs/discord.js/issues/9052), [Unknown interaction #7005](https://github.com/discordjs/discord.js/issues/7005)
- Discord rate limits: [Discord API docs](https://discord.com/developers/docs/topics/rate-limits), [Thread create rate limit discussion](https://www.answeroverflow.com/m/1336870347659546696)
- Supabase upsert + unique constraint races: [supabase-js issue #2049](https://github.com/supabase/supabase-js/issues/2049), [orgs/supabase discussion #3721](https://github.com/orgs/supabase/discussions/3721)
- Vitest symlink/mock split: [vitest issue #5633](https://github.com/vitest-dev/vitest/issues/5633)
