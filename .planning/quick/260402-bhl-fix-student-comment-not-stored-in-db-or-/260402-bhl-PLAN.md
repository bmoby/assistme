---
phase: quick
plan: 260402-bhl
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/021_add_student_comment.sql
  - packages/core/src/types/index.ts
  - packages/core/src/db/formation/exercises.ts
  - packages/bot-discord/src/handlers/dm-handler.ts
  - packages/bot-discord/src/utils/format.ts
  - packages/bot-discord/src/handlers/dm-handler.test.ts
  - packages/bot-discord/src/utils/review-thread.test.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "student_comment captured by DM agent is persisted to DB on both first submission and resubmission"
    - "student_comment is displayed in the admin review thread so the trainer sees what the student wrote"
    - "All existing tests pass, new test coverage verifies comment flow"
  artifacts:
    - path: "supabase/migrations/021_add_student_comment.sql"
      provides: "student_comment TEXT column on student_exercises table"
      contains: "student_comment"
    - path: "packages/core/src/types/index.ts"
      provides: "student_comment field on StudentExercise interface"
      contains: "student_comment"
    - path: "packages/core/src/db/formation/exercises.ts"
      provides: "student_comment accepted and stored by submitExercise and resubmitExercise"
    - path: "packages/bot-discord/src/utils/format.ts"
      provides: "student_comment displayed in review thread submission message"
  key_links:
    - from: "packages/bot-discord/src/handlers/dm-handler.ts"
      to: "packages/core/src/db/formation/exercises.ts"
      via: "intent.student_comment passed to submitExercise/resubmitExercise params"
      pattern: "student_comment.*intent"
    - from: "packages/core/src/db/formation/exercises.ts"
      to: "supabase/migrations/021_add_student_comment.sql"
      via: "insert/update includes student_comment field"
      pattern: "student_comment"
    - from: "packages/bot-discord/src/utils/format.ts"
      to: "packages/core/src/types/index.ts"
      via: "exercise.student_comment read and rendered in thread message"
      pattern: "exercise\\.student_comment"
---

<objective>
Fix the student_comment data loss bug: the DM agent captures student comments but they are never stored in the database or shown in admin review threads.

Purpose: The trainer needs to see what the student wrote when reviewing submissions. Currently `student_comment` is captured by the DM agent, used for empty-check and preview, but never persisted or displayed to the admin.

Output: Full pipeline fix from DB column through type, DB functions, handler, and display, with updated tests.
</objective>

<execution_context>
@/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/.claude/get-shit-done/workflows/execute-plan.md
@/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/core/src/types/index.ts (StudentExercise interface at lines 94-114)
@packages/core/src/db/formation/exercises.ts (submitExercise at line 7, resubmitExercise at line 250)
@packages/bot-discord/src/handlers/dm-handler.ts (executeSubmission at line 155, handleSubmissionIntent at line 276)
@packages/bot-discord/src/utils/format.ts (formatReviewThreadMessages at line 152)
@packages/bot-discord/src/utils/review-thread.ts (createReviewThread — consumes formatReviewThreadMessages)
@packages/bot-discord/src/handlers/dm-handler.test.ts (existing submission tests)
@packages/bot-discord/src/utils/review-thread.test.ts (existing review thread tests)
@packages/core/src/db/formation/exercises.test.ts (existing exercises tests)

<interfaces>
<!-- Key types and contracts the executor needs -->

From packages/core/src/types/index.ts (lines 94-114):
```typescript
export interface StudentExercise {
  id: string;
  student_id: string;
  module: number;
  exercise_number: number;
  submission_url: string | null;
  submission_type: string;
  submitted_at: string;
  ai_review: Record<string, unknown> | null;
  manual_review: string | null;
  status: ExerciseStatus;
  reviewed_at: string | null;
  feedback: string | null;
  session_id: string | null;
  submission_count: number;
  review_history: ReviewHistoryEntry[];
  notification_message_id: string | null;
  review_thread_id: string | null;
  review_thread_ai_message_id: string | null;
  created_at: string;
}
```

From packages/core/src/ai/formation/dm-agent.ts (line 41):
```typescript
export interface SubmissionIntent {
  session_number: number;
  student_comment?: string;
}
```

From packages/core/src/db/formation/exercises.ts:
```typescript
export async function submitExercise(params: {
  student_id: string; session_id: string; module: number;
  exercise_number: number; submission_url: string; submission_type?: string;
}): Promise<StudentExercise>

export async function resubmitExercise(exerciseId: string, params: {
  submission_url: string | null; submission_type: string;
}): Promise<StudentExercise>
```

From packages/bot-discord/src/handlers/dm-handler.ts (line 155):
```typescript
async function executeSubmission(
  message: Message, conv: ConversationState, intent: SubmissionIntent,
  student: Student, session: Session,
  isResubmission: boolean, revisionExercise: StudentExercise | null
): Promise<void>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add student_comment column, type field, and DB function params</name>
  <files>
    supabase/migrations/021_add_student_comment.sql,
    packages/core/src/types/index.ts,
    packages/core/src/db/formation/exercises.ts
  </files>
  <action>
    1. Create `supabase/migrations/021_add_student_comment.sql`:
       ```sql
       ALTER TABLE student_exercises ADD COLUMN student_comment TEXT;
       ```
       Single column, nullable, no default needed. TEXT not VARCHAR — student comments can be any length.

    2. In `packages/core/src/types/index.ts`, add `student_comment: string | null;` to the `StudentExercise` interface, after the `feedback` field (around line 107). This follows the existing nullable string pattern used by `feedback`, `manual_review`, etc.

    3. In `packages/core/src/db/formation/exercises.ts`:

       a. `submitExercise` — add optional `student_comment?: string` to the params object. In the `.insert()` call, add `student_comment: params.student_comment ?? null` after `status: 'submitted'`.

       b. `resubmitExercise` — add optional `student_comment?: string` to the params object (alongside `submission_url` and `submission_type`). In the `.update()` call, add `student_comment: params.student_comment ?? null` in the update object. This ensures the comment is refreshed on each resubmission (old comment replaced by new one).
  </action>
  <verify>
    <automated>cd /Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe\ coder && pnpm typecheck</automated>
  </verify>
  <done>
    - Migration file exists with ALTER TABLE ADD COLUMN
    - StudentExercise type includes student_comment: string | null
    - submitExercise accepts and inserts student_comment
    - resubmitExercise accepts and updates student_comment
    - pnpm typecheck passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire student_comment through handler and display in review thread</name>
  <files>
    packages/bot-discord/src/handlers/dm-handler.ts,
    packages/bot-discord/src/utils/format.ts
  </files>
  <action>
    1. In `packages/bot-discord/src/handlers/dm-handler.ts`, function `executeSubmission` (line 155):

       a. In the FIRST SUBMISSION path (line 206), add `student_comment: intent.student_comment` to the `submitExercise()` call params object.

       b. In the RE-SUBMISSION path (line 190), add `student_comment: intent.student_comment` to the `resubmitExercise()` call params object.

    2. In `packages/bot-discord/src/utils/format.ts`, function `formatReviewThreadMessages` (line 152):

       After the files section (around line 184, after the `attachmentsWithUrls` loop), add a student comment section to `submissionLines`:
       ```typescript
       // Student comment
       if (exercise.student_comment) {
         submissionLines.push('', '💬 **Commentaire etudiant :**', exercise.student_comment);
       }
       ```
       Place this BEFORE the final `submissionMsg = submissionLines.join(...)` line.
       Use French since the review thread is formateur-facing (admin channel).
  </action>
  <verify>
    <automated>cd /Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe\ coder && pnpm typecheck</automated>
  </verify>
  <done>
    - executeSubmission passes intent.student_comment to both submitExercise and resubmitExercise
    - formatReviewThreadMessages renders student_comment in the submission message when present
    - pnpm typecheck passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Update tests to verify student_comment flows end-to-end</name>
  <files>
    packages/bot-discord/src/handlers/dm-handler.test.ts,
    packages/bot-discord/src/utils/review-thread.test.ts
  </files>
  <action>
    1. In `packages/bot-discord/src/handlers/dm-handler.test.ts`:

       a. In the existing Test 16 "executes submission when Soumettre button is clicked" (line 707): the test already sets `student_comment: 'Мой ответ'` on the submissionIntent. Update the `expect(mockSubmitExercise).toHaveBeenCalledWith(...)` assertion to verify that `student_comment: 'Мой ответ'` is included in the call params:
       ```typescript
       expect(mockSubmitExercise).toHaveBeenCalledWith(
         expect.objectContaining({ student_id: student.id, session_id: 'sess-c', student_comment: 'Мой ответ' })
       );
       ```

       b. Add a new test after Test 16 that verifies `student_comment` is passed to `resubmitExercise` on re-submission. Set up:
       - A student with `discord_id`
       - `mockGetExercisesByStudent` returns an exercise with `status: 'revision_needed'` and matching `session_id`
       - `submissionIntent` with `student_comment: 'Исправил'`
       - Assert `mockResubmitExercise` was called with params including `student_comment: 'Исправил'`

    2. In `packages/bot-discord/src/utils/review-thread.test.ts`:

       No changes needed — the `formatReviewThreadMessages` is already mocked in these tests (line 15-23). The mock returns fixed strings, which is correct for testing thread creation logic independently. The format.ts logic itself is tested implicitly via typecheck and can be verified manually.

    3. Run full test suite to confirm everything passes.
  </action>
  <verify>
    <automated>cd /Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe\ coder && pnpm test:unit</automated>
  </verify>
  <done>
    - Test 16 now asserts student_comment is passed to submitExercise
    - New test verifies student_comment passed to resubmitExercise on re-submission
    - All unit tests pass (pnpm test:unit)
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck` passes — no type errors across all packages
2. `pnpm test:unit` passes — all existing + new tests green
3. Manual check: `grep -n student_comment packages/core/src/db/formation/exercises.ts` shows the field in both submitExercise and resubmitExercise
4. Manual check: `grep -n student_comment packages/bot-discord/src/utils/format.ts` shows the display in formatReviewThreadMessages
5. Manual check: `grep -n student_comment packages/bot-discord/src/handlers/dm-handler.ts` shows it passed through in executeSubmission
</verification>

<success_criteria>
- student_comment column exists in migration SQL
- StudentExercise type includes student_comment field
- submitExercise and resubmitExercise accept and store student_comment
- dm-handler passes intent.student_comment to both DB functions
- formatReviewThreadMessages renders student_comment in the review thread
- All tests pass including new assertions for student_comment flow
</success_criteria>

<output>
After completion, create `.planning/quick/260402-bhl-fix-student-comment-not-stored-in-db-or-/260402-bhl-SUMMARY.md`
</output>
