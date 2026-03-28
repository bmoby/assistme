# Phase 10: Student Quiz Experience - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

L'etudiant peut passer un quiz complet en DM — QCM via boutons, V/F via boutons, questions ouvertes via texte libre — pause/reprise libre — et recevoir un feedback detaille question par question avec score total, entierement en russe.

Requirements: QUIZ-01 to QUIZ-08, EVAL-01 to EVAL-06 (14 requirements)

</domain>

<decisions>
## Implementation Decisions

### Open Question Input
- **D-13:** Students answer open questions by typing **plain text in the DM** — no modal, no button, just a normal message. The bot waits for the next message after showing an open question.
- **D-14:** **No confirmation step** on open answers — the first message the student sends after an open question is accepted as the answer. Zero friction, one-shot quiz means no need for editing.

### Resume Experience
- **D-15:** When a student returns mid-quiz, the bot sends a **recap message** ("Вы остановились на вопросе 5/12. Продолжаем!") then immediately shows the next question. Quick context, no extra clicks.
- **D-16:** Resume is triggered by **any DM message** — the bot checks if the student has an `in_progress` session on every incoming message or interaction. Works even if the original "Начать" button is buried in scroll history.
- **D-17:** When a new quiz arrives while a student has one in progress, the old session is **silently closed** (`expired_incomplete` with partial score). Student only sees the new quiz DM with "Начать" — no notification about the old one.

### AI Evaluation
- **D-18:** Open question grading uses **lenient semantic matching** — the student's answer must convey the same idea as the expected answer from the TXT. Synonyms, different phrasing, partial wording all accepted. Only factually wrong or completely off-topic answers are marked incorrect.
- **D-19:** AI evaluation uses **Sonnet** model for higher accuracy on edge cases.
- **D-20:** AI evaluation happens **immediately after each open answer** — result stored in `student_quiz_answers.ai_evaluation` right away. No delay at feedback time.

### Feedback Display
- **D-21:** End-of-quiz feedback is a **score embed + compact Q-by-Q list**: first a score header ("Результат: 8/12 (67%)"), then each question with checkmark/cross + student's answer + (for incorrect only) correct answer and explanation.
- **D-22:** Explanation from the TXT is shown **only on incorrect answers** — correct answers just show checkmark and student's answer. Keeps feedback focused on what the student needs to learn.
- **D-23:** If feedback exceeds Discord's 2000-char message limit, **truncate explanations** to fit in a single message rather than splitting into multiple messages.

### Carried Forward (Prior Phases)
- **D-01 (Phase 8):** Quiz expiry = 48h, cron every 30min
- **D-02 (Phase 8):** Bot name = TeacherBot
- **D-03 (Phase 8):** Admin channel = quiz-admin
- **D-09 (Phase 9):** `quiz_start_` customId uses `session.id` (StudentQuizSession) for routing
- QCM/V-F: exact match (binary correct/incorrect)
- One-shot: no re-attempt, completed quiz cannot be retaken

### Claude's Discretion
- Button customId format for answer interactions (e.g., `quiz_answer_{sessionId}_{choice}`)
- Exact Russian text for all student-facing messages (quality, tone)
- Embed styling (colors, fields, footer)
- How to handle edge cases: student sends random text during a QCM question, etc.
- Internal batching/throttling of AI evaluation calls if needed
- Truncation strategy for long explanations (cut at sentence boundary vs hard char limit)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bot Discord Quiz (package existant)
- `packages/bot-discord-quiz/src/index.ts` — Entry point, client setup, intents (Guilds + DirectMessages + GuildMembers)
- `packages/bot-discord-quiz/src/config.ts` — CHANNELS.quizAdmin, ROLES.admin/student
- `packages/bot-discord-quiz/src/handlers/index.ts` — Placeholder for Phase 10 handlers
- `packages/bot-discord-quiz/src/cron/close-expired-quizzes.ts` — Existing expiry cron

### Core DB (quiz CRUD)
- `packages/core/src/db/quiz/quizzes.ts` — createQuiz, getQuiz, getQuizBySession, getActiveQuizzes, updateQuizStatus
- `packages/core/src/db/quiz/sessions.ts` — createQuizSession, getQuizSession, getSessionsByQuiz, getActiveSessionByStudent, updateQuizSession, closeExpiredQuizSessions
- `packages/core/src/db/quiz/answers.ts` — saveAnswer, getAnswersBySession
- `packages/core/src/types/index.ts` — Quiz, QuizQuestion, StudentQuizSession, StudentQuizAnswer types + status enums

### Core AI
- `packages/core/src/ai/client.ts` — askClaude() for open question AI evaluation

### Bot Discord principal (patterns a suivre)
- `packages/bot-discord/src/handlers/button-handler.ts` — registerButton() prefix-based routing pattern
- `packages/bot-discord/src/handlers/dm-handler.ts` — DM message handling and interaction routing pattern

### Phase 9 implementation (quiz creation + dispatch)
- `packages/bot-discord-quiz/src/commands/` — Existing slash commands (quiz-create, quiz-status, quiz-close)
- Review Phase 9 plans for dispatch implementation and "Начать" button format

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getActiveSessionByStudent(studentId)` — Returns the most recent not_started or in_progress session for a student. Key for resume detection.
- `saveAnswer({ session_id, question_id, student_answer, is_correct, ai_evaluation })` — Ready-to-use answer persistence
- `updateQuizSession(id, updates)` — Update status, current_question, score, timestamps
- `getAnswersBySession(sessionId)` — Ordered by answered_at, ready for feedback generation
- `askClaude({ prompt, systemPrompt, model })` — For AI evaluation of open answers
- `registerButton(prefix, handler)` pattern from bot-discord — can be replicated or shared

### Established Patterns
- **Button routing:** prefix-based `registerButton('quiz_start_', handler)` dispatches to handler by customId prefix
- **DB operations:** async functions in core, import via `@assistme/core`, Supabase client singleton
- **Embeds:** `EmbedBuilder` + `ActionRowBuilder` + `ButtonBuilder` for interactive messages
- **DM sending:** `member.createDM()` then `dm.send({ embeds, components })`

### Integration Points
- `handlers/index.ts` (placeholder) — Wire up button interaction handlers + DM message handler
- `interactionCreate` event — Route button clicks to answer handlers
- `messageCreate` event — Route DM text messages to open answer handler and resume detection
- `@assistme/core` — All DB reads/writes and AI evaluation calls

</code_context>

<specifics>
## Specific Ideas

- Question delivery is sequential: one question at a time, `current_question` tracks position in quiz_questions ordered by question_number
- QCM buttons: A/B/C/D labels matching the choices from quiz_questions.choices
- V/F buttons: "Правда" / "Ложь" (Russian labels)
- "Начать" button already dispatched in Phase 9 with customId `quiz_start_{sessionId}`
- Feedback preview format validated by user: score header + compact list with emoji markers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-student-quiz-experience*
*Context gathered: 2026-03-28*
