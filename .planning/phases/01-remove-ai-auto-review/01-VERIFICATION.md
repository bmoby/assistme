---
phase: 01-remove-ai-auto-review
verified: 2026-03-31T10:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 01: Remove AI Auto-Review — Verification Report

**Phase Goal:** Exercises flow from submission to admin review without any AI involvement -- no auto-score, no AI placeholder, no AI feedback to students
**Verified:** 2026-03-31T10:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Plan 01-01 must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Student submits exercise and receives simple acknowledgment DM with no AI score or feedback | VERIFIED | `dm-handler.ts:261-262` — only `Задание отправлено на проверку!` sent, no AI score logic present |
| 2 | Admin notification embed in #admin has no AI score field | VERIFIED | `format.ts` `formatSubmissionNotification`: no `aiScore`, no `Score IA` field; grep confirms 0 matches for those patterns in the function |
| 3 | Review thread is created with submission content and action buttons only -- no AI placeholder message | VERIFIED | `review-thread.ts` new-thread path: messages are `submissionMsg`, optional `historyMsg`, then action buttons row. No `thread.send('Review IA')` anywhere |
| 4 | No fire-and-forget AI review is triggered after submission | VERIFIED | `dm-handler.ts`: 0 matches for `triggerAiReview`, `reviewExercise`, `createFormationEvent` |
| 5 | ai_review_complete event is no longer processed by the event dispatcher | VERIFIED | `event-dispatcher.ts`: 0 matches for `ai_review_complete` |
| 6 | Progress embed counts only submitted (not ai_reviewed) as pending | VERIFIED | `format.ts:65` — `exercises.filter((e) => e.status === 'submitted').length` — `ai_reviewed` absent from `formatProgressEmbed` |

### Observable Truths (from Plan 01-02 must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | New exercise submissions never reach ai_reviewed status | VERIFIED | `exercises.ts`: all 4 query locations use `.eq('status', 'submitted')` only; `setAiReview` function deleted |
| 8 | Pending exercise queries filter by submitted only for new submissions | VERIFIED | `exercises.ts:102,204,240` — `.eq('status', 'submitted')`; `exercises.ts:174` — JS filter uses `submitted` only |
| 9 | Old exercises with ai_reviewed status are still accepted by review buttons (backward compat) | VERIFIED | `review-buttons.ts:51,111` — both `handleReviewOpen` and `handleReviewDecision` still check `exercise.status !== 'submitted' && exercise.status !== 'ai_reviewed'` |
| 10 | Progress counts treat submitted as the only pending status going forward | VERIFIED | Combined: `format.ts` `formatProgressEmbed` (submitted only) + `exercises.ts` all pending queries (submitted only) + `dm-agent.ts` `get_pending_feedback` filter removes `ai_reviewed` |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/bot-discord/src/handlers/dm-handler.ts` | Submission flow without AI trigger | VERIFIED | 0 occurrences of `reviewExercise`, `triggerAiReview`, `createFormationEvent`; `getSignedUrlsForExercise` present (different function, legitimately used at line 601 for signed URL fetching) |
| `packages/bot-discord/src/utils/review-thread.ts` | Thread creation without AI placeholder | VERIFIED | Thread sends: submissionMsg, optional historyMsg, action buttons only. Returns `{ threadId, aiMessageId: null }` in both paths. 0 occurrences of `Review IA`, `en cours`, `review_thread_ai_message_id` |
| `packages/bot-discord/src/utils/format.ts` | Notification embed without AI score; progress embed without ai_reviewed | VERIFIED | `formatSubmissionNotification` has no AI score field. `formatProgressEmbed` uses `submitted` only. `ai_reviewed` appears only in `STATUS_EMOJI` constant (display map, not flow logic) and inside `formatReviewThreadMessages` (dead output — see Level 4 below) |
| `packages/bot-discord/src/cron/event-dispatcher.ts` | No ai_review_complete handler | VERIFIED | 0 occurrences of `ai_review_complete` |
| `packages/bot-discord/src/handlers/review-buttons.ts` | Backward compat for ai_reviewed, no Score IA display | VERIFIED | `handleReviewSession` no longer shows Score IA. Backward compat checks present at lines 51 and 111 |
| `packages/core/src/db/formation/exercises.ts` | Pending queries filter submitted only | VERIFIED | 0 occurrences of `ai_reviewed`; 4 pending query locations all use `.eq('status', 'submitted')` |
| `packages/core/src/ai/formation/dm-agent.ts` | get_pending_feedback without ai_reviewed filter | VERIFIED | 0 occurrences of `ai_reviewed`; filter at line 281 uses `approved || revision_needed` |
| `packages/core/src/ai/formation/tsarag-agent.ts` | Pending exercise listing filtering submitted only | VERIFIED | 0 occurrences of `ai_reviewed`; both filter expressions use `submitted` only |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dm-handler.ts::executeSubmission` | `notifyAdminChannel` | direct call after DB write (no AI detour) | VERIFIED | `void notifyAdminChannel(...)` call present; no AI trigger between DB write and admin notification |
| `review-thread.ts::createReviewThread` | `thread.send (buttons)` | submission content then buttons (no AI message in between) | VERIFIED | New-thread path: `thread.send(submissionMsg)`, optional `thread.send(historyMsg)`, then `thread.send({ content, components: [row] })` — no AI message in between |
| `review-buttons.ts::handleReviewOpen` | exercises matching submitted or ai_reviewed | status check condition | VERIFIED | `exercise.status !== 'submitted' && exercise.status !== 'ai_reviewed'` at lines 51 and 111 |
| `exercises.ts::getPendingExercises` | Supabase query | `.eq status submitted` | VERIFIED | `.eq('status', 'submitted')` at line 102 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `format.ts::formatReviewThreadMessages` | `aiReviewMsg` | `exercise.ai_review` field (DB column) | Technically computable but never consumed | INFO: dead output — `aiReviewMsg` is returned in the function signature but no caller in `review-thread.ts` destructures or uses it. Both call sites (`lines 52, 94`) destructure only `{ submissionMsg, imageUrl }` and `{ submissionMsg, historyMsg, imageUrl }`. The AI review content computed in this function is dead code — it never flows to any Discord message. This is consistent with the plan's design decision D-05 (function not deleted, just disconnected). |
| `format.ts::formatProgressEmbed` | `pending` | `exercises.filter(submitted)` | Real count from caller-provided array | FLOWING |
| `exercises.ts::getPendingExercises` | exercises | Supabase `.eq('status', 'submitted')` | Real DB query | FLOWING |

**Note on `aiReviewMsg` in `formatReviewThreadMessages`:** The `Score IA` text at `format.ts:232` appears inside the history section of `formatReviewThreadMessages`. This is the review history entry's AI score from a previous submission cycle (data that may exist in DB from before this cleanup). It is rendered into `historyMsg` (not `aiReviewMsg`). However this is historical data display, not new AI review generation. The value flows into `historyMsg` which IS used — but only when `exercise.review_history.length > 0`. This is a pre-existing data display concern, not a new AI trigger. Classified as INFO.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit test suite passes with 0 failures | `pnpm test:unit` | 34 files, 269 tests passed, 0 failures | PASS |
| `reviewExercise`/`triggerAiReview` absent from dm-handler | `grep -c` on dm-handler.ts | 0 | PASS |
| `ai_review_complete` absent from event-dispatcher | `grep -c` on event-dispatcher.ts | 0 | PASS |
| `ai_reviewed` absent from exercises.ts | `grep -c` on exercises.ts | 0 | PASS |
| `ai_reviewed` absent from dm-agent.ts | `grep -c` on dm-agent.ts | 0 | PASS |
| `ai_reviewed` absent from tsarag-agent.ts | `grep -c` on tsarag-agent.ts | 0 | PASS |
| Backward compat check in review-buttons (2 locations) | `grep -c` on review-buttons.ts | 2 matches | PASS |
| Student acknowledgment DM preserved | `grep` for confirmation string | Match at line 261-262 | PASS |
| All documented commits exist in git log | `git log` for 2309df2, 405c066, 7857632, 818c935 | All 4 verified | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLEAN-01 | Plan 01-01 | Supprimer le fire-and-forget de l'AI review apres soumission dans dm-handler | SATISFIED | `triggerAiReview` function deleted, import removed, fire-and-forget block removed from `executeSubmission` |
| CLEAN-02 | Plan 01-01 | Supprimer le placeholder/message IA dans les threads de review | SATISFIED | `review-thread.ts`: no `Review IA` message sent in either thread reuse or new thread path; `aiMessageId: null` returned always |
| CLEAN-03 | Plan 01-01 | Supprimer le score IA et la recommandation des notifications admin | SATISFIED | `formatSubmissionNotification` has no AI score field; `Score IA` absent from admin embed |
| CLEAN-04 | Plan 01-01 | Simplifier le DM etudiant apres soumission (accuse de reception sans score IA) | SATISFIED | Student DM = `Задание отправлено на проверку!` only; `formatStudentFeedbackDM` has no AI score field |
| CLEAN-05 | Plan 01-02 | Le statut passe directement de submitted a en attente de review admin (plus de ai_reviewed) | SATISFIED | All 4 DB query locations in `exercises.ts` use `.eq('status', 'submitted')`; both agent filters (`dm-agent.ts`, `tsarag-agent.ts`) removed `ai_reviewed`; `formatProgressEmbed` counts `submitted` only |

**REQUIREMENTS.md traceability check:**

All 5 requirement IDs declared in both PLAN frontmatter are accounted for:
- Plan 01-01: [CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04] — all 4 SATISFIED
- Plan 01-02: [CLEAN-05] — SATISFIED

**CLEAN-06** (Phase 3, cleanup dead imports/references to exercise-reviewer) is mapped to Phase 3 in REQUIREMENTS.md. It is deliberately out of scope for Phase 1. `exercise-reviewer.ts` still exists — this is the intended state per plan design decision D-04/D-05. Not flagged as a gap.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/bot-discord/src/utils/format.ts` | 190-218 | `aiReviewMsg` computed and returned but never consumed by any caller | INFO | Dead output in function return value — no user-visible impact. The return type still includes `aiReviewMsg: string | null`. This is pre-planned dead code per D-05 (cleanup deferred to Phase 3 via CLEAN-06). Not a blocker. |
| `packages/bot-discord/src/utils/format.ts` | 232 | `Score IA : ${entryScore}/10` rendered into `historyMsg` (review history display) | INFO | This shows historical AI scores from old submissions in the history section of review threads. For new submissions there will be no `ai_review` in history entries, so `entryScore` will always be `undefined`. No user-visible impact for new submissions. Pre-existing data display, not new AI generation. Not a blocker. |

No blocker anti-patterns found.

---

## Human Verification Required

No items require human verification. All observable behaviors are programmatically verifiable via file inspection and unit tests.

---

## Gaps Summary

No gaps found. All 10 must-have truths verified. All 5 required artifacts pass all levels. All key links wired correctly. Requirements CLEAN-01 through CLEAN-05 are satisfied. Unit test suite: 34 files, 269 tests, 0 failures.

Two INFO-level items noted:
1. `aiReviewMsg` dead output in `formatReviewThreadMessages` — pre-planned, cleaned up in Phase 3 (CLEAN-06)
2. Historical `Score IA` display in review history — only relevant for old data, not new submissions

Both are known and accepted per the phase design decisions.

---

_Verified: 2026-03-31T10:30:00Z_
_Verifier: Claude (gsd-verifier)_
