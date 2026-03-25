---
phase: 06-submission-handler-correctness-student-ux
plan: 01
subsystem: bot-discord/dm-handler + core/dm-agent
tags: [submission-flow, discord-buttons, ux, validation, preview-confirm]
dependency_graph:
  requires: [05-01]
  provides: [submission-preview-confirm-flow, empty-submission-guard, session-validation, error-cleanup]
  affects: [dm-handler.ts, dm-agent.ts]
tech_stack:
  added: [EmbedBuilder, ComponentType, awaitMessageComponent]
  patterns: [preview-confirm, intent-pattern, fire-and-forget-ai-review]
key_files:
  created: []
  modified:
    - packages/core/src/ai/formation/dm-agent.ts
    - packages/core/src/ai/index.ts
    - packages/bot-discord/src/handlers/dm-handler.ts
    - packages/core/src/ai/formation/dm-agent.test.ts
decisions:
  - "DM agent returns SubmissionIntent (session_number + student_comment) instead of executing DB write — handler owns full submission lifecycle"
  - "uploadFileToStorage and triggerAiReview moved from dm-agent.ts to dm-handler.ts — submission logic belongs in handler layer"
  - "120-second awaitMessageComponent timeout — buttons disable on expiry, pendingAttachments preserved for retry (D-02)"
  - "Empty submission check: both pendingAttachments empty AND student_comment empty/whitespace required to reject (D-07)"
  - "Re-submission detection via getExercisesByStudent finding revision_needed or approved status for same session_id (D-05, D-06)"
metrics:
  duration: 7min
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_modified: 4
---

# Phase 06 Plan 01: Submission Handler Correctness + Student UX Summary

## One-liner

Preview-confirm submission flow with Discord buttons: DM agent returns intent, handler validates session and emptiness, shows EmbedBuilder preview with Soumettre/Annuler buttons (2-min timeout), then executes DB write only after confirm.

## What Was Built

### Task 1: dm-agent.ts — Submission Intent Pattern

The `create_submission` tool case no longer executes `handleCreateSubmission` (DB write). Instead:
- New `SubmissionIntent` interface exported: `{ session_number: number; student_comment?: string }`
- New `submissionIntent?` field added to `DmAgentResponse`
- Tool case captures intent data, returns `{ success: true, awaiting_confirmation: true }` to Claude
- `handleCreateSubmission`, `uploadFileToStorage`, `triggerAiReview` functions removed from dm-agent.ts
- Unused imports removed: `submitExercise`, `resubmitExercise`, `deleteAttachmentsByExercise`, `deleteStorageFiles`, `addAttachment`, `getSignedUrl`, `reviewExercise`, `createFormationEvent`
- Tool description updated: "Подготовить сдачу задания. Система покажет студенту предпросмотр для подтверждения."
- `SubmissionIntent` type exported from `packages/core/src/ai/index.ts`
- dm-agent.test.ts updated: `create_submission` test now verifies `submissionIntent` returned with correct `session_number`, no `submitExercise` call

### Task 2: dm-handler.ts — Preview-Confirm Lifecycle

New functions added to the handler:

**`uploadFileToStorage`** (moved from dm-agent): Uses `getSupabase()` from `@assistme/core`, uploads to `exercise-submissions` storage bucket.

**`triggerAiReview`** (moved from dm-agent): Gets signed URLs, calls `reviewExercise`, updates exercise with `updateExercise`, fires `ai_review_complete` formation event.

**`handleSubmissionIntent`**: Full preview-confirm flow:
1. Resolves student via `getStudentByDiscordId`
2. Empty submission guard (SUB-02): rejects if `pendingAttachments` empty AND `student_comment` blank
3. Session validation (UX-02): `getSessionByNumber` — error if not found or not published
4. Active submission check: `getExerciseByStudentAndSession` — blocks if already `submitted`/`ai_reviewed`
5. Re-submission detection (UX-03): `getExercisesByStudent` finds `revision_needed`/`approved` exercise
6. `EmbedBuilder` preview: session title/module, comment excerpt (200 char limit), file list with sizes, link list
7. `ActionRowBuilder` with Soumettre (success/green) + Annuler (secondary) buttons
8. `awaitMessageComponent` with 2-min timeout, filtered to message author
9. Confirm: `deferUpdate`, calls `executeSubmission`, disables buttons
10. Cancel (UX-04): clears `pendingAttachments`, updates embed to red "❌ Сдача отменена", disables buttons
11. Timeout (D-02): updates embed to grey "⏱ Время истекло", disables buttons, preserves attachments

**`executeSubmission`**: DB write after confirm — uploads files, calls `submitExercise` or `resubmitExercise`, creates attachment records, triggers AI review (fire-and-forget), clears `pendingAttachments`, replies confirmation, fires `notifyAdminChannel`.

**`processDmMessage` modifications**:
- After `runDmAgent`, checks `result.submissionIntent` → calls `handleSubmissionIntent` (no text reply)
- Legacy `result.submissionId` path kept as safety fallback
- Normal response path: `sendLongMessage` as before
- Catch block (SUB-04): `conv.pendingAttachments = []` to prevent stale attachment leakage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Pre-existing type errors in dm-agent.test.ts fixtures**
- **Found during:** Task 1 typecheck
- **Issue:** MOCK_SESSIONS fixture missing `replay_url: null` field (Session type updated in Phase 5); `searchFormationKnowledge` mock missing `tags`, `source_file`, `similarity`, `text_rank` fields
- **Fix:** Added missing fields to test fixtures to match current type definitions
- **Files modified:** `packages/core/src/ai/formation/dm-agent.test.ts`
- **Commit:** a6eb330

**2. [Rule 2 - Missing functionality] `setAiReview` not exported from `@assistme/core`**
- **Found during:** Task 2 implementation
- **Issue:** `setAiReview` from `exercises.ts` is exported but `triggerAiReview` in dm-agent.ts called it. Rather than adding another import, used `updateExercise` with `{ ai_review, status: 'ai_reviewed' }` which is equivalent and already exported.
- **Fix:** `triggerAiReview` in dm-handler.ts uses `updateExercise` instead of the unexported `setAiReview`
- **Files modified:** `packages/bot-discord/src/handlers/dm-handler.ts`
- **Commit:** 3a56db4

### Out-of-scope Pre-existing Issues (deferred)
- `faq-agent.test.ts` type errors (FaqEntry missing fields)
- `tsarag-agent.test.ts` type errors (Student missing `created_at`/`updated_at`)
- `dm-agent.integration.test.ts` rootDir error
- `students.integration.test.ts` possibly undefined error

These were pre-existing before this plan and are not caused by our changes.

## Known Stubs

None — all submission logic is wired end-to-end.

## Verification Results

- `pnpm test:unit -- --run`: 135 tests pass across 20 test files
- `pnpm typecheck`: 0 errors in files modified by this plan (pre-existing errors in other test files remain)
- All acceptance criteria verified:
  - `dm-agent.ts` contains `export interface SubmissionIntent`
  - `dm-agent.ts` `DmAgentResponse` contains `submissionIntent?: SubmissionIntent`
  - `dm-agent.ts` does NOT contain `handleCreateSubmission`, `uploadFileToStorage`, `triggerAiReview`
  - `dm-agent.ts` `case 'create_submission'` sets `pendingSubmissionIntent` with `awaiting_confirmation: true`
  - `dm-agent.ts` does NOT import from `exercise-reviewer.js` or `submitExercise`/`resubmitExercise`
  - `dm-handler.ts` contains `handleSubmissionIntent`, `executeSubmission`, `uploadFileToStorage`
  - `dm-handler.ts` contains `awaitMessageComponent` with `time: 120_000`
  - `dm-handler.ts` has `submission_confirm` and `submission_cancel` button customIds
  - `dm-handler.ts` uses `EmbedBuilder` with session number in title
  - `dm-handler.ts` catch block clears `conv.pendingAttachments` (SUB-04)
  - `dm-handler.ts` checks both `pendingAttachments` and `student_comment` for empty guard (SUB-02)
  - `dm-handler.ts` calls `getSessionByNumber` for session validation (UX-02)

## Self-Check: PASSED
