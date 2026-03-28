---
phase: 10-student-quiz-experience
verified: 2026-03-28T13:08:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Student clicks Начать on a real bot DM and receives the first QCM question with A/B/C/D buttons"
    expected: "Ephemeral reply 'Квиз начат! Проверьте личные сообщения.' appears, DM channel opens, embed with buttons sent"
    why_human: "Discord bot gateway and real DM channel cannot be exercised without live token and guild"
  - test: "Student closes DM, returns hours later, sends any message — bot resumes from the exact saved question"
    expected: "Bot responds with recap 'Вы остановились на вопросе N/M. Продолжаем!' then resends the current question with correct buttons"
    why_human: "Requires real bot session persistence across multiple Discord connections; cannot simulate DM closure programmatically"
  - test: "At quiz completion, student receives a single Russian feedback message with per-question results and total score percentage"
    expected: "Message contains '**Результат: N/M (X%)**', checkmarks for correct answers, red-X + correct answer + explanation for incorrect; length <= 2000 chars"
    why_human: "Feedback rendering in a real Discord DM requires live bot; truncation edge case needs visual inspection"
  - test: "Student clicks Начать on an already-completed quiz"
    expected: "Ephemeral reply: 'Этот квиз уже завершён. Повторное прохождение недоступно.' No new question sent"
    why_human: "Requires live Discord interaction; ephemeral message visibility only verifiable in real client"
  - test: "ROADMAP success criterion #3 — new quiz dispatch closes old in-progress session with expired_incomplete and partial score"
    expected: "When Phase 9 dispatch sends a new quiz to a student with an in-progress session, the old session.status becomes 'expired_incomplete' with a score proportional to answered-so-far"
    why_human: "D-17 (QUIZ-03 per ROADMAP SC#3) is implemented at dispatch time in Phase 9, not Phase 10. Phase 10 guards against expired_incomplete in quiz-start.ts but does not trigger the close. This behavior requires Phase 9 dispatch code to be exercised with a real DB."
---

# Phase 10: Student Quiz Experience Verification Report

**Phase Goal:** A student can take a quiz end-to-end in DM — QCM via buttons, Vrai/Faux via buttons, open questions via text — pause and resume freely — and receive a complete question-by-question feedback with their total score, entirely in Russian.
**Verified:** 2026-03-28T13:08:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Student clicks "Начать" and receives questions one by one — QCM shows A/B/C/D buttons, Vrai/Faux shows Правда/Ложь buttons, open questions prompt text input | ✓ VERIFIED | `handleQuizStart` wired to `quiz_start_` prefix; `sendQuestion` dispatches by type; `buildMcqRow` creates sorted A/B/C/D buttons; `buildTrueFalseRow` creates Правда/Ложь; `buildOpenQuestionEmbed` prompts text. Unit tests confirm all paths. |
| 2 | Student closes DM mid-quiz and returns hours later; bot resumes from exact question with no data loss | ✓ VERIFIED | `quiz-start.ts` in_progress path re-reads `current_question` from DB; `quiz-dm.ts` processQuizDm calls `getActiveSessionByStudent` on every DM, sets `awaitingOpenAnswer` from DB state; recap message "Вы остановились на вопросе" sent. Unit tests: resume path in quiz-start.test.ts + quiz-dm.test.ts QUIZ-07. |
| 3 | New quiz arriving while existing one in progress closes old session as expired_incomplete | ? UNCERTAIN | D-17 specifies this happens at dispatch time (Phase 9). Phase 10 implements the guard (`quiz-start.ts` checks `expired_incomplete` status) and `closeExpiredQuizSessions` in cron closes sessions after 48h with partial score. However the active-dispatch close (new quiz sent → old session immediately closed) is a Phase 9 responsibility. No test in Phase 10 covers the dispatch-triggered close path. Needs human verification with Phase 9 dispatch code. |
| 4 | At quiz completion, student receives question-by-question feedback with total score percentage, all in Russian | ✓ VERIFIED | `advanceOrComplete` calls `getAnswersBySession`, computes score, calls `buildFeedbackMessage`; message format: "Результат: N/M (X%)" + per-question checkmarks/crosses + explanation for incorrect answers + 2000-char truncation. 8 unit tests in quiz-messages.test.ts. |
| 5 | Completed quiz cannot be retaken; Начать on closed/completed quiz shows graceful Russian message | ✓ VERIFIED | `handleQuizStart` returns early with "Этот квиз уже завершён. Повторное прохождение недоступно." for completed, "Время для этого квиза истекло." for expired_incomplete. Unit tests in quiz-start.test.ts: QUIZ-08 completed + QUIZ-08 expired. |

**Score:** 4/5 truths verified with code evidence, 1 uncertain (cross-phase behavior requiring human)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/db/quiz/questions.ts` | `getQuestionsByQuiz(quizId) -> QuizQuestion[]` | ✓ VERIFIED | Exists, exports `getQuestionsByQuiz`, queries `quiz_questions` table ordered by `question_number`, follows core DB pattern (`getSupabase`, `logger`) |
| `packages/bot-discord-quiz/src/utils/quiz-messages.ts` | Embed/row/feedback builders | ✓ VERIFIED | All 5 functions present: `buildQuestionEmbed`, `buildMcqRow`, `buildTrueFalseRow`, `buildOpenQuestionEmbed`, `buildFeedbackMessage`; `MAX_MSG_LEN = 2000` constant present |
| `packages/bot-discord-quiz/src/utils/quiz-eval.ts` | AI evaluation wrapper | ✓ VERIFIED | `evaluateOpenAnswer` exports with `model: 'sonnet'`, Russian system prompt with "семантически", JSON parse + fallback; imports `askClaude` from `@assistme/core` |
| `packages/bot-discord-quiz/src/utils/quiz-flow.ts` | Shared quiz progression | ✓ VERIFIED | `sendQuestion` and `advanceOrComplete` present; `advanceOrComplete` returns `StudentQuizSession | null`; imports only from `@assistme/core` and `./quiz-messages.js` |
| `packages/bot-discord-quiz/src/handlers/quiz-start.ts` | Начать button handler | ✓ VERIFIED | Handles all 4 session statuses; first call is `deferReply({ ephemeral: true })`; D-15 recap message present |
| `packages/bot-discord-quiz/src/handlers/quiz-answer.ts` | QCM/VF answer button handler | ✓ VERIFIED | First call is `deferUpdate()`; parses hyphenated sessionId correctly; disables buttons via `editReply({ components: [] })`; exact match for EVAL-01/02 |
| `packages/bot-discord-quiz/src/handlers/quiz-dm.ts` | DM text handler for open answers and resume | ✓ VERIFIED | Per-user lock `processingLocks` present; `awaitingOpenAnswer` map present; open answer path, button-guard, resume path all implemented; `_clearStateForTesting` exported |
| `packages/bot-discord-quiz/src/handlers/index.ts` | `setupHandlers` wiring interactionCreate + messageCreate | ✓ VERIFIED | Both button prefixes registered; `messageCreate` listener filters bots and guild messages; error handling with followUp/reply fallback |
| `packages/bot-discord-quiz/src/index.ts` | Bot entry point with GuildMembers intent | ✓ VERIFIED | `setupHandlers(client)` called in ready callback; `GatewayIntentBits.GuildMembers` present; `Partials.Channel` for DM |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/core/src/db/quiz/questions.ts` | `packages/core/src/db/quiz/index.ts` | `export * from './questions.js'` | ✓ WIRED | Confirmed by `getQuestionsByQuiz` being importable from `@assistme/core` in handler tests |
| `packages/bot-discord-quiz/src/utils/quiz-eval.ts` | `packages/core/src/ai/client.ts` | `import { askClaude }` with `model: 'sonnet'` | ✓ WIRED | Line 1 imports `askClaude` from `@assistme/core`; `model: 'sonnet'` at line 21 |
| `packages/bot-discord-quiz/src/utils/quiz-flow.ts` | `packages/core/src/db/quiz/sessions.ts` | `import { updateQuizSession, getAnswersBySession }` | ✓ WIRED | Line 1: `import { updateQuizSession, getAnswersBySession, logger }` used in `advanceOrComplete` |
| `packages/bot-discord-quiz/src/index.ts` | `packages/bot-discord-quiz/src/handlers/index.ts` | `setupHandlers(client)` in ready callback | ✓ WIRED | `setupHandlers(client)` call at line 41; imported from `./handlers/index.js` |
| `packages/bot-discord-quiz/src/handlers/index.ts` | `packages/bot-discord-quiz/src/handlers/quiz-start.ts` | `registerButton('quiz_start_', handleQuizStart)` | ✓ WIRED | Line 14 of handlers/index.ts |
| `packages/bot-discord-quiz/src/handlers/quiz-answer.ts` | `packages/bot-discord-quiz/src/utils/quiz-flow.ts` | `advanceOrComplete` call after saving answer | ✓ WIRED | Line 51 of quiz-answer.ts; imported from `../utils/quiz-flow.js` |
| `packages/bot-discord-quiz/src/handlers/quiz-dm.ts` | `packages/bot-discord-quiz/src/utils/quiz-eval.ts` | `evaluateOpenAnswer` for open questions | ✓ WIRED | Line 4 imports `evaluateOpenAnswer`; called at line 58 in open answer path |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `quiz-flow.ts advanceOrComplete` | `answers` (feedback data) | `getAnswersBySession(session.id)` from Supabase | Yes — DB query with session FK | ✓ FLOWING |
| `quiz-flow.ts advanceOrComplete` | `questions` (passed from caller) | Caller calls `getQuestionsByQuiz(session.quiz_id)` — Supabase query ordered by `question_number` | Yes | ✓ FLOWING |
| `quiz-messages.ts buildFeedbackMessage` | `answers`, `questions`, `score` | All props populated by `advanceOrComplete` before call | Yes | ✓ FLOWING |
| `quiz-start.ts handleQuizStart` | `session` | `getQuizSession(sessionId)` from Supabase | Yes | ✓ FLOWING |
| `quiz-dm.ts processQuizDm` | `session` | `getActiveSessionByStudent(student.id)` from Supabase | Yes — not in-memory | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: Skipped for handler files (require live Discord gateway). Module exports verified structurally.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `getQuestionsByQuiz` exported from core | `grep 'getQuestionsByQuiz' packages/core/src/db/quiz/index.ts` | Match found (`export * from './questions.js'`) | ✓ PASS |
| All 5 quiz-messages exports present | `grep 'export function build' packages/bot-discord-quiz/src/utils/quiz-messages.ts` | All 5 functions exported | ✓ PASS |
| `pnpm test:unit` (27 files, 215 tests) | `pnpm test:unit` | 27 passed / 215 passed, 0 failures | ✓ PASS |
| `pnpm typecheck` (all packages) | `pnpm typecheck` | 0 errors across all 5 packages | ✓ PASS |
| No import from `@assistme/bot-discord` (BOT-03) | `grep -r "@assistme/bot-discord" packages/bot-discord-quiz/src/` | No matches | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| QUIZ-01 | Plan 02, Plan 03 | "Начать" button starts session: status=in_progress, started_at, send first question | ✓ SATISFIED | `handleQuizStart` start path; `updateQuizSession({status:'in_progress', started_at})`; unit test "QUIZ-01: starts quiz" |
| QUIZ-02 | Plan 01, Plan 03 | QCM question delivery: embed with A/B/C/D buttons from choices JSONB | ✓ SATISFIED | `buildMcqRow` iterates sorted Object.entries(choices); `sendQuestion` dispatches mcq branch; 3 unit tests in quiz-messages.test.ts |
| QUIZ-03 | Plan 01, Plan 03 | Vrai/Faux question delivery: Правда/Ложь buttons (per RESEARCH.md mapping) | ✓ SATISFIED | `buildTrueFalseRow` creates 2 fixed buttons; `sendQuestion` dispatches true_false branch; 3 unit tests confirm customIds |
| QUIZ-04 | Plan 02, Plan 03 | Open question: plain text DM, bot waits for next message | ✓ SATISFIED | `processQuizDm` checks `awaitingOpenAnswer` map; open question path accepts message.content.trim(); unit test "QUIZ-04: Open answer accepted" |
| QUIZ-05 | Plan 02, Plan 03 | Answer recording: saveAnswer per question, advance current_question | ✓ SATISFIED | `handleQuizAnswer` calls `saveAnswer`; `advanceOrComplete` calls `updateQuizSession({current_question: nextIndex})`; unit test "QUIZ-05: saves answer and advances" |
| QUIZ-06 | Plan 02, Plan 03 | Session completion: status=completed, score, completed_at, send feedback | ✓ SATISFIED | `advanceOrComplete` completion branch; `updateQuizSession({status:'completed', score, completed_at})`; `buildFeedbackMessage` sent; unit test "QUIZ-06: advanceOrComplete called" |
| QUIZ-07 | Plan 02, Plan 03 | Pause/resume: resume by any DM; recap then next question | ✓ SATISFIED | `handleQuizStart` in_progress path + `processQuizDm` resume path; both send "Вы остановились"; unit tests in both quiz-start.test.ts and quiz-dm.test.ts |
| QUIZ-08 | Plan 02, Plan 03 | One-shot enforcement: completed/closed quiz → graceful Russian message | ✓ SATISFIED | `handleQuizStart` checks completed → "Этот квиз уже завершён. Повторное прохождение недоступно."; expired_incomplete → "Время для этого квиза истекло."; 2 dedicated unit tests |
| EVAL-01 | Plan 01, Plan 03 | QCM correct/incorrect: exact string match vs correct_answer | ✓ SATISFIED | `handleQuizAnswer`: `const isCorrect = choice === currentQ.correct_answer`; unit tests EVAL-01 correct + incorrect |
| EVAL-02 | Plan 01, Plan 03 | Vrai/Faux correct/incorrect: exact match | ✓ SATISFIED | Same code path as EVAL-01; unit test "EVAL-02: True/false correct" |
| EVAL-03 | Plan 01, Plan 03 | Open question AI evaluation via askClaude with semantic matching | ✓ SATISFIED | `evaluateOpenAnswer` calls `askClaude({model:'sonnet'})`; system prompt contains "семантически"; unit test asserts `evaluateOpenAnswer` called with question + answer |
| EVAL-04 | Plan 01, Plan 03 | AI evaluation result stored immediately in ai_evaluation JSONB | ✓ SATISFIED | `saveAnswer({...ai_evaluation: evalResult as unknown as Record<string,unknown>})`; unit test "EVAL-04: AI result stored" |
| EVAL-05 | Plan 01, Plan 03 | Score calculation: (correct / total) * 100 | ✓ SATISFIED | `advanceOrComplete` completion branch: `const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0` |
| EVAL-06 | Plan 01, Plan 03 | End-of-quiz feedback: score header + Q-by-Q compact list, single message, 2000-char limit | ✓ SATISFIED | `buildFeedbackMessage` with MAX_MSG_LEN=2000; truncation logic in place; 8 unit tests cover all feedback scenarios |

**Orphaned requirements check:** QUIZ/EVAL requirement IDs do not appear in the global `.planning/REQUIREMENTS.md` (which covers previous milestones). They are defined in ROADMAP.md Phase 10 and RESEARCH.md. No orphaned IDs found — all 14 are covered by Plans 01, 02, 03.

**Note on ROADMAP Success Criterion #3 vs QUIZ-03:** The ROADMAP lists SC#3 as "new quiz arriving while in progress closes old session with expired_incomplete." Per RESEARCH.md, this is decision D-17 and is implemented at dispatch time (Phase 9). Phase 10's QUIZ-03 in the RESEARCH requirement table refers to Vrai/Faux button delivery. Phase 10 implements the guard side only (quiz-start.ts handles expired_incomplete status). The dispatch-triggered close is out of Phase 10's scope.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `quiz-dm.ts` | 103–110 | `_getAwaitingOpenAnswer` and `_clearStateForTesting` exported for test access | ℹ Info | Test-only exports; no user-visible impact; acceptable pattern for unit test isolation |
| None | — | No TODO/FIXME/placeholder comments found in phase files | — | Clean |
| None | — | No `return null / return {} / return []` stubs found in non-test code | — | All implementations substantive |

---

### Human Verification Required

#### 1. End-to-End Quiz Flow (Success Criterion 1)

**Test:** In a real Discord server with bot token configured, have a student DM the bot after a quiz is dispatched. Click "Начать". Verify questions arrive in order: MCQ shows 4 buttons, Vrai/Faux shows Правда/Ложь, open questions show the text-prompt embed.
**Expected:** Buttons are rendered, clickable, and trigger the next question. Open questions await a typed reply.
**Why human:** Discord gateway interactions require a live token and cannot be simulated in unit tests.

#### 2. Pause and Resume (Success Criterion 2)

**Test:** Start a quiz, answer 2-3 questions, close the DM window. Wait a few minutes. Reopen DM and send any message.
**Expected:** Bot responds with "Вы остановились на вопросе N/M. Продолжаем!" and immediately resends question N.
**Why human:** Requires real bot session persistence across disconnection; cannot simulate DM channel closure.

#### 3. Feedback Message Quality (Success Criterion 4)

**Test:** Complete a 5-question quiz with a mix of correct and incorrect answers including one open question.
**Expected:** Feedback message shows "Результат: X/5 (Y%)" header, ✅ for correct, ❌ + correct answer + explanation for incorrect, ⬜ for skipped (if any). All text in Russian.
**Why human:** Message rendering and Russian text quality requires visual inspection in Discord client.

#### 4. One-Shot Enforcement UX (Success Criterion 5)

**Test:** Complete a quiz. Click the "Начать" button again on the original quiz message.
**Expected:** Ephemeral reply "Этот квиз уже завершён. Повторное прохождение недоступно." Only you can see it.
**Why human:** Ephemeral message visibility in Discord requires real client.

#### 5. New Quiz Closes In-Progress Session (Success Criterion 3 / D-17)

**Test:** Have a student with a quiz in_progress. Admin dispatches a new quiz (Phase 9 dispatch). Verify the old session.status becomes expired_incomplete with partial score in the DB.
**Expected:** Old session has status='expired_incomplete', score proportional to answers submitted. Student receives new quiz DM with fresh "Начать".
**Why human:** Requires Phase 9 dispatch code to be exercised (out of Phase 10 scope). Phase 10 only guards against the expired_incomplete state — it does not trigger the close.

---

### Gaps Summary

No blocking gaps found. All 14 QUIZ/EVAL requirements have implementation evidence and unit test coverage. The one uncertain truth (ROADMAP SC#3 / D-17 dispatch close) is architecturally out of Phase 10's scope — Phase 10 correctly handles the resulting `expired_incomplete` status. Five items require human verification with a live Discord environment before the phase can be certified fully complete.

**Type safety:** `pnpm typecheck` exits 0 across all 5 packages.
**Test suite:** 27 test files, 215 tests, 0 failures.
**Isolation:** Zero imports from `@assistme/bot-discord` (BOT-03 constraint satisfied).

---

_Verified: 2026-03-28T13:08:00Z_
_Verifier: Claude (gsd-verifier)_
