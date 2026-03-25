---
phase: 06-submission-handler-correctness-student-ux
verified: 2026-03-25T18:10:00Z
status: passed
score: 8/8 must-haves verified
gaps: []
human_verification:
  - test: "Manual DM flow with real Discord bot"
    expected: "Student sends a file, bot shows EmbedBuilder preview with Soumettre/Annuler buttons, clicking Soumettre writes to DB and sends admin notification, clicking Annuler clears state"
    why_human: "Full button interaction lifecycle requires a live Discord gateway connection — cannot verify without running bot with real token"
  - test: "Button timeout in live environment"
    expected: "After 2 minutes of inactivity, buttons become disabled and embed title changes to 'Время истекло', pendingAttachments are preserved"
    why_human: "120-second real-time timeout requires live bot — simulated in tests but live behavior needs spot check"
---

# Phase 6: Submission Handler Correctness + Student UX Verification Report

**Phase Goal:** Students can submit exercises with confidence — empty submissions are blocked, sessions are validated, re-submission works cleanly, and the preview-then-confirm flow is reliable
**Verified:** 2026-03-25T18:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Empty submission (no files, no links, no substantive text) is rejected before preview | VERIFIED | `handleSubmissionIntent` lines 337-342 in dm-handler.ts check both `pendingAttachments.length === 0` AND `student_comment.trim().length === 0`, reply with "Нечего отправлять"; Test 13 passes |
| 2 | Invalid session number produces error message, no DB write | VERIFIED | `getSessionByNumber` called at line 345 of dm-handler.ts; null or non-published session replies with error including session number; Test 14 passes |
| 3 | Student sees an embed summary with Soumettre and Annuler buttons before submission is committed | VERIFIED | `EmbedBuilder` + `ActionRowBuilder` with `submission_confirm` / `submission_cancel` buttons built and sent via `message.reply({ embeds, components })` at line 426; Test 15 passes |
| 4 | Clicking Annuler clears pendingAttachments and confirms cancellation | VERIFIED | Cancel branch at line 459 sets `conv.pendingAttachments = []`, edits embed to red "Сдача отменена", replies "Сдача отменена. Данные очищены."; Test 17 passes |
| 5 | Clicking Soumettre writes to DB and fires admin notification | VERIFIED | Confirm branch calls `executeSubmission` which calls `submitExercise`/`resubmitExercise`, then fires `notifyAdminChannel` fire-and-forget; Test 16 passes verifying `submitExercise` called with correct `student_id` and `session_id` |
| 6 | Button timeout (2 min) disables buttons and shows expiry message, pendingAttachments stay | VERIFIED | `awaitMessageComponent({ time: 120_000 })` catch block at line 466 edits embed to grey "Время истекло" and disables buttons; does NOT clear `pendingAttachments`; Test 18 passes |
| 7 | Re-submission after feedback goes through the same preview-confirm flow | VERIFIED | `getExercisesByStudent` finds `revision_needed`/`approved` exercise; sets `isResubmission = true`; `executeSubmission` calls `resubmitExercise` instead of `submitExercise`; Test 20 passes asserting `mockResubmitExercise` called and `mockSubmitExercise` not called |
| 8 | DM agent error clears pendingAttachments to prevent stale leakage | VERIFIED | `processDmMessage` catch block at line 596-602 sets `conv.pendingAttachments = []`; Test 19 passes — second `runDmAgent` call receives empty `pendingAttachments` |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/ai/formation/dm-agent.ts` | DM agent returns SubmissionIntent instead of executing create_submission | VERIFIED | 452 lines; exports `SubmissionIntent` interface; `DmAgentResponse.submissionIntent?: SubmissionIntent` present; no `handleCreateSubmission`, `uploadFileToStorage`, `triggerAiReview`; no imports of `submitExercise`, `resubmitExercise`, `exercise-reviewer.js` |
| `packages/bot-discord/src/handlers/dm-handler.ts` | Preview-confirm flow with ActionRowBuilder buttons, session validation, empty submission guard, error cleanup | VERIFIED | 744 lines; contains `handleSubmissionIntent`, `executeSubmission`, `uploadFileToStorage`, `triggerAiReview`; `awaitMessageComponent` with `time: 120_000`; `submission_confirm` and `submission_cancel` button customIds; SUB-04 catch block present |
| `packages/bot-discord/src/handlers/dm-handler.test.ts` | 8+ new unit tests for Phase 6 behaviors | VERIFIED | 905 lines; 20 total test cases (12 pre-existing + 8 new, Tests 13-20); `makeReplyMessageMock` helper present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/core/src/ai/formation/dm-agent.ts` | `packages/bot-discord/src/handlers/dm-handler.ts` | `DmAgentResponse.submissionIntent` field | VERIFIED | `dm-agent.ts` returns `{ text, submissionIntent: pendingSubmissionIntent }`; `dm-handler.ts` line 581 checks `result.submissionIntent` and routes to `handleSubmissionIntent` |
| `packages/bot-discord/src/handlers/dm-handler.ts` | `packages/core/src/db/formation/exercises.ts` | `submitExercise` and `resubmitExercise` calls in `executeSubmission` after button confirm | VERIFIED | Lines 215 and 231 in dm-handler.ts call `resubmitExercise` (re-submission path) and `submitExercise` (first submission path) respectively; both imported from `@assistme/core` |
| `packages/bot-discord/src/handlers/dm-handler.ts` | `packages/core/src/db/formation/sessions.ts` | `getSessionByNumber` for session validation | VERIFIED | Line 345 in dm-handler.ts calls `getSessionByNumber(intent.session_number)`; function exported from `@assistme/core` via `db/formation/index.ts` -> `sessions.ts` |
| `packages/bot-discord/src/handlers/dm-handler.test.ts` | `packages/bot-discord/src/handlers/dm-handler.ts` | `vi.mock` + `setupDmHandler` + `__emit` + `drainProcessing` | VERIFIED | Test file imports `setupDmHandler`, `_clearStateForTesting`; uses `makeClient().__emit`; 143 tests pass |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `dm-handler.ts` — `handleSubmissionIntent` | `session` | `getSessionByNumber(intent.session_number)` — DB query via `packages/core/src/db/formation/sessions.ts` | Yes — queries `sessions` table by `session_number` | FLOWING |
| `dm-handler.ts` — `executeSubmission` | `exercise` (returned by submitExercise) | `submitExercise({ student_id, session_id, ... })` — INSERT into `student_exercises` table | Yes — atomic INSERT with `session_id` (SUB-03 from Phase 5) | FLOWING |
| `dm-agent.ts` — tool loop | `pendingSubmissionIntent` | `input.session_number`, `input.student_comment` from Claude tool call | Yes — Claude supplies real values based on conversation context | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for live bot behavior (requires running Discord bot with real token and gateway connection). Unit tests cover all 8 behaviors programmatically.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 143 unit tests pass | `pnpm test:unit -- --run` | 143 passed, 0 failed, 20 test files | PASS |
| dm-agent.ts has no removed functions | grep for `handleCreateSubmission\|uploadFileToStorage.*dm-agent` | No matches | PASS |
| dm-agent.ts returns submission intent | grep for `pendingSubmissionIntent` | Lines 346, 397, 444, 450 — intent captured and returned | PASS |
| dm-handler.ts has 2-min timeout | grep for `time: 120_000` | Line 447 confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SUB-02 | 06-01-PLAN.md, 06-02-PLAN.md | Soumission vide refusee (pas de fichier, lien, ou texte substantiel) | SATISFIED | `handleSubmissionIntent` checks `!hasAttachments && !hasComment` at line 339, replies "Нечего отправлять"; Test 13 verifies |
| SUB-04 | 06-01-PLAN.md, 06-02-PLAN.md | `pendingAttachments` nettoye sur erreur agent (pas de fuite d'etat entre messages) | SATISFIED | `processDmMessage` catch block at line 596 sets `conv.pendingAttachments = []`; Test 19 verifies by checking second call receives empty array |
| UX-01 | 06-01-PLAN.md, 06-02-PLAN.md | Bot affiche un recapitulatif avec bouton "Soumettre" / "Annuler" avant soumission | SATISFIED | `EmbedBuilder` with session title, comment excerpt, file list, link list; `ActionRowBuilder` with two buttons; Tests 15, 16 verify |
| UX-02 | 06-01-PLAN.md, 06-02-PLAN.md | Etudiant precise le numero de session — bot valide l'existence en DB, refuse si inexistant | SATISFIED | `getSessionByNumber` called; null or non-published status returns error message with session number; Test 14 verifies |
| UX-03 | 06-01-PLAN.md, 06-02-PLAN.md | Re-soumission autorisee apres feedback — remplace l'ancienne soumission, meme processus | SATISFIED | `getExercisesByStudent` finds `revision_needed`/`approved` exercise; `resubmitExercise` called instead of `submitExercise`; Test 20 verifies |
| UX-04 | 06-01-PLAN.md, 06-02-PLAN.md | Etudiant peut annuler une soumission en cours ("annuler", bouton Cancel) | SATISFIED | Cancel button (`submission_cancel`) clears `pendingAttachments`, edits embed to red, replies confirmation; Test 17 verifies |

All 6 requirements declared in both plans are satisfied. No orphaned requirements — all 6 map correctly to Phase 6 per REQUIREMENTS.md traceability table.

### Anti-Patterns Found

No anti-patterns detected in the modified files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No issues found |

Scanned for: `TODO/FIXME/PLACEHOLDER`, `return null/\[\]/\{\}`, hardcoded empty state, console.log-only implementations, empty handlers. None found in `dm-agent.ts`, `dm-handler.ts`, or `dm-handler.test.ts`.

### Human Verification Required

#### 1. Full DM Preview-Confirm Flow (Live Bot)

**Test:** Send a Discord DM to the bot with an attached image and say "I want to submit my exercise for session 1". After the bot responds, verify an EmbedBuilder preview message appears with "Soumettre" (green) and "Annuler" (grey) buttons. Click "Soumettre".
**Expected:** Buttons become disabled, confirmation message "Задание отправлено на проверку!" appears, admin #админ channel receives a notification embed, exercise record appears in DB.
**Why human:** Button interaction lifecycle requires live Discord gateway; `awaitMessageComponent` filter on `i.user.id === message.author.id` requires real user identity.

#### 2. Button Timeout Live Check

**Test:** Send a submission that shows the preview embed. Wait 2 minutes without clicking either button.
**Expected:** Buttons become disabled, embed title changes to "Время истекло" (grey). A follow-up message with an attachment should still be processed (pendingAttachments were preserved).
**Why human:** 120-second timeout can only be verified in live conditions; unit test uses mock rejection which is functionally equivalent but cannot substitute for real timer behavior.

### Gaps Summary

No gaps. All 8 truths verified, all 6 requirements satisfied, all key links wired, all artifacts exist and are substantive. Two items flagged for human verification as good practice — these are observational checks on live Discord behavior, not blockers to goal achievement.

---

_Verified: 2026-03-25T18:10:00Z_
_Verifier: Claude (gsd-verifier)_
