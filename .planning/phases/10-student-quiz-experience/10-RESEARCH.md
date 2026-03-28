# Phase 10: Student Quiz Experience - Research

**Researched:** 2026-03-28
**Domain:** discord.js 14 DM interaction handling, sequential quiz state machine, AI open-answer evaluation, in-memory session locking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-13:** Students answer open questions by typing plain text in the DM — no modal, no button, just a normal message. The bot waits for the next message after showing an open question.
- **D-14:** No confirmation step on open answers — the first message the student sends after an open question is accepted as the answer. Zero friction, one-shot quiz means no need for editing.
- **D-15:** When a student returns mid-quiz, the bot sends a recap message ("Вы остановились на вопросе 5/12. Продолжаем!") then immediately shows the next question. Quick context, no extra clicks.
- **D-16:** Resume is triggered by any DM message — the bot checks if the student has an `in_progress` session on every incoming message or interaction. Works even if the original "Начать" button is buried in scroll history.
- **D-17:** When a new quiz arrives while a student has one in progress, the old session is silently closed (`expired_incomplete` with partial score). Student only sees the new quiz DM with "Начать" — no notification about the old one.
- **D-18:** Open question grading uses lenient semantic matching — the student's answer must convey the same idea as the expected answer from the TXT. Synonyms, different phrasing, partial wording all accepted. Only factually wrong or completely off-topic answers are marked incorrect.
- **D-19:** AI evaluation uses Sonnet model for higher accuracy on edge cases.
- **D-20:** AI evaluation happens immediately after each open answer — result stored in `student_quiz_answers.ai_evaluation` right away. No delay at feedback time.
- **D-21:** End-of-quiz feedback is a score embed + compact Q-by-Q list: first a score header ("Результат: 8/12 (67%)"), then each question with checkmark/cross + student's answer + (for incorrect only) correct answer and explanation.
- **D-22:** Explanation from the TXT is shown only on incorrect answers — correct answers just show checkmark and student's answer. Keeps feedback focused on what the student needs to learn.
- **D-23:** If feedback exceeds Discord's 2000-char message limit, truncate explanations to fit in a single message rather than splitting into multiple messages.
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUIZ-01 | "Начать" button starts the session: set status=in_progress, started_at, send first question | `updateQuizSession()` handles status updates; `getQuizSession()` resolves session from customId |
| QUIZ-02 | QCM question delivery: embed with A/B/C/D buttons derived from `choices` JSONB field | `ButtonBuilder` + `ActionRowBuilder` pattern established in bot-discord; choices parsed from `QuizQuestion.choices` |
| QUIZ-03 | Vrai/Faux question delivery: "Правда"/"Ложь" buttons | Same pattern as QUIZ-02 with fixed 2-button set |
| QUIZ-04 | Open question delivery: plain text prompt, bot waits for next DM message | Per D-13/D-14: handled by `messageCreate` event handler with in-memory state tracking active open question |
| QUIZ-05 | Answer recording: `saveAnswer()` per question, advance `current_question` | `saveAnswer()` + `updateQuizSession()` already in core; idempotency via lock per userId |
| QUIZ-06 | Session completion: when last question answered, set status=completed, score, completed_at, send feedback | `updateQuizSession()` + `getAnswersBySession()` for final score/feedback calculation |
| QUIZ-07 | Pause/resume: resume triggered by any DM; recap message then next question | `getActiveSessionByStudent()` already queries `in_progress`/`not_started` sessions; in-memory state NOT the source of truth — DB is |
| QUIZ-08 | One-shot enforcement: completed/closed quiz produces graceful Russian message on "Начать" click | Check session status before proceeding in `quiz_start_` handler |
| EVAL-01 | QCM correct/incorrect: exact string match of student choice vs `correct_answer` | Simple string equality; `is_correct` set to true/false |
| EVAL-02 | Vrai/Faux correct/incorrect: exact match | Same as EVAL-01 |
| EVAL-03 | Open question AI evaluation: `askClaude()` with lenient semantic matching prompt | `askClaude({ prompt, systemPrompt, model: 'sonnet' })` from `@assistme/core` |
| EVAL-04 | AI evaluation result stored immediately in `ai_evaluation` JSONB field | `saveAnswer()` accepts `ai_evaluation` parameter already |
| EVAL-05 | Score calculation: (correct answers / total questions) * 100 | Pattern already used in `closeExpiredQuizSessions()`; replicated at completion |
| EVAL-06 | End-of-quiz feedback: score header + Q-by-Q compact list, single message, 2000-char limit | `getAnswersBySession()` returns ordered answers; join against questions array for full feedback build |
</phase_requirements>

---

## Summary

Phase 10 is the student-facing quiz runtime — the part a student actually sees and interacts with. The infrastructure (DB tables, types, core DB functions, bot scaffold, expiry cron) was built in Phase 8. Phase 9 builds the admin quiz creation and dispatch flow. Phase 10 wires up the student-side: start, answer, pause, resume, evaluate, and feedback.

The architecture follows the same event-driven DM handler pattern as `packages/bot-discord/src/handlers/dm-handler.ts` — a `messageCreate` listener and an `interactionCreate` (button) listener, with an in-memory per-user lock to serialize concurrent messages. The critical difference is that quiz state is anchored in the database (not in-memory conversations), which is why pause/resume works correctly: the bot reads `getActiveSessionByStudent()` on every message rather than relying on a volatile in-memory map.

The two new functions that must be added to `packages/core/src/db/quiz/` before any handler work can happen are: `getQuestionsByQuiz(quizId)` (returns ordered QuizQuestion array) and a helper to fetch a single question by number. These do not exist today — only an internal query inside `closeExpiredQuizSessions` touches `quiz_questions`.

**Primary recommendation:** Implement a three-layer handler structure — (1) button handler for `quiz_start_` and `quiz_answer_` prefixes, (2) DM text handler for open answers, (3) in-memory per-user lock to serialize. All DB reads/writes go through `@assistme/core`. Wire everything in `handlers/index.ts` which is currently an empty placeholder.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord.js | ^14.16.0 | Button interactions, DM messages, EmbedBuilder, ActionRowBuilder | Already in package; bot-discord-quiz uses it since Phase 8 |
| @assistme/core | workspace:* | All DB operations (sessions, answers, quizzes, questions), askClaude, logger, types | Zero-import-from-bot-discord rule (D-03 Phase 8); core exports everything needed |
| vitest | ^4.1.1 | Unit tests | Already registered in root vitest.config.ts as `bot-discord-quiz` project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^17.3.1 | Already loaded in index.ts | No changes needed |

### New core DB function needed

| Function | Location | Purpose |
|----------|----------|---------|
| `getQuestionsByQuiz(quizId)` | `packages/core/src/db/quiz/questions.ts` (new file) | Returns `QuizQuestion[]` ordered by `question_number ASC` |

This function does not exist today. It must be added to core (and exported via `packages/core/src/db/quiz/index.ts`) as Wave 0 of the implementation. The bot cannot deliver questions without it.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory per-user `activeQuestion` flag | DB-driven state only | Memory flag is faster to check but lost on restart — DB approach (checking `current_question` + `status`) is crash-safe and correct for pause/resume |
| `awaitMessageComponent` for all answers | Global `messageCreate` handler | `awaitMessageComponent` would block the event loop per DM channel; global handler with per-user lock is the established pattern in bot-discord |

---

## Architecture Patterns

### Handler Structure

```
packages/bot-discord-quiz/src/
├── handlers/
│   ├── index.ts             # setupHandlers(client): wires interactionCreate + messageCreate
│   ├── quiz-start.ts        # handleQuizStart(interaction): prefix quiz_start_
│   ├── quiz-answer.ts       # handleQuizAnswer(interaction): prefix quiz_answer_
│   └── quiz-dm.ts           # handleQuizDm(message): DM text messages (open answers + resume)
├── utils/
│   ├── quiz-messages.ts     # buildQuestionEmbed/Row, buildFeedbackMessage (pure functions)
│   └── quiz-eval.ts         # evaluateOpenAnswer(question, studentAnswer): calls askClaude
```

### Pattern 1: Button handler wiring (established)

Wire into `handlers/index.ts` using the `registerButton` prefix pattern from bot-discord. The quiz bot cannot import from bot-discord, so reproduce the 20-line `registerButton` / `handleButtonInteraction` pattern locally.

```typescript
// Source: packages/bot-discord/src/handlers/button-handler.ts (replicate locally)
// handlers/index.ts
import { Client, Interaction, Message } from 'discord.js';
import { handleQuizStart } from './quiz-start.js';
import { handleQuizAnswer } from './quiz-answer.js';
import { handleQuizDm } from './quiz-dm.js';

const buttonHandlers = new Map<string, (i: ButtonInteraction) => Promise<void>>();

export function registerButton(prefix: string, handler: (i: ButtonInteraction) => Promise<void>): void {
  buttonHandlers.set(prefix, handler);
}

export function setupHandlers(client: Client): void {
  registerButton('quiz_start_', handleQuizStart);
  registerButton('quiz_answer_', handleQuizAnswer);

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    for (const [prefix, handler] of buttonHandlers) {
      if (interaction.customId.startsWith(prefix)) {
        try { await handler(interaction); }
        catch (err) {
          logger.error({ err, customId: interaction.customId }, 'Button handler error');
          const reply = { content: 'Произошла ошибка. Попробуйте позже.', ephemeral: true };
          if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
          else await interaction.reply(reply);
        }
        return;
      }
    }
  });

  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (message.guild !== null) return; // DMs only
    await handleQuizDm(message);
  });

  logger.info('Quiz handlers registered');
}
```

Call `setupHandlers(client)` inside the `client.once('ready', ...)` callback in `src/index.ts` after `registerCronJobs`.

**Required: Add `GuildMembers` intent to `src/index.ts`** — Phase 8 scaffold only had `Guilds` + `DirectMessages`. To look up guild members and resolve `student.discord_id`, the `GuildMembers` privileged intent is needed (same as main bot-discord). Update `src/index.ts`:
```typescript
intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.GuildMembers,  // ADD: needed for student lookup
],
```

### Pattern 2: quiz_start_ handler flow

```typescript
// handlers/quiz-start.ts
export async function handleQuizStart(interaction: ButtonInteraction): Promise<void> {
  const sessionId = interaction.customId.replace('quiz_start_', '');
  await interaction.deferReply({ ephemeral: true });

  const session = await getQuizSession(sessionId);
  if (!session) {
    await interaction.editReply('Квиз не найден.');
    return;
  }

  // One-shot enforcement (QUIZ-08)
  if (session.status === 'completed' || session.status === 'expired_incomplete') {
    await interaction.editReply('Этот квиз уже завершён. Повторное прохождение недоступно.');
    return;
  }

  // If already in_progress — resume (D-16 handles this in DM handler, but direct click should also work)
  if (session.status === 'in_progress') {
    // Resume path: send recap then next question
    await handleResume(interaction.user.id, session, interaction);
    return;
  }

  // Start: mark in_progress
  const updated = await updateQuizSession(session.id, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });

  const questions = await getQuestionsByQuiz(session.quiz_id);
  const firstQuestion = questions[0];
  if (!firstQuestion) {
    await interaction.editReply('Вопросы не найдены. Обратитесь к преподавателю.');
    return;
  }

  await interaction.editReply('Квиз начат! Ответьте в личных сообщениях.');

  // Send first question to DM
  const dmChannel = await interaction.user.createDM();
  await sendQuestion(dmChannel, updated, firstQuestion, questions.length);
}
```

### Pattern 3: quiz_answer_ handler flow

customId format: `quiz_answer_{sessionId}_{encodedChoice}`

```typescript
// handlers/quiz-answer.ts
export async function handleQuizAnswer(interaction: ButtonInteraction): Promise<void> {
  // Parse: quiz_answer_{sessionId}_{choice}
  const withoutPrefix = interaction.customId.replace('quiz_answer_', '');
  const separatorIdx = withoutPrefix.indexOf('_');
  const sessionId = withoutPrefix.slice(0, separatorIdx);
  const choice = withoutPrefix.slice(separatorIdx + 1);

  await interaction.deferUpdate();

  const session = await getQuizSession(sessionId);
  if (!session || session.status !== 'in_progress') {
    await interaction.followUp({ content: 'Сессия уже завершена.', ephemeral: true });
    return;
  }

  const questions = await getQuestionsByQuiz(session.quiz_id);
  const currentQ = questions[session.current_question];
  if (!currentQ) return;

  const isCorrect = choice === currentQ.correct_answer;

  await saveAnswer({
    session_id: session.id,
    question_id: currentQ.id,
    student_answer: choice,
    is_correct: isCorrect,
    ai_evaluation: null,
  });

  // Disable buttons on answered question
  await interaction.editReply({ components: [] });

  // Advance or complete
  await advanceOrComplete(interaction.user.id, session, questions);
}
```

### Pattern 4: DM text handler (open answers + resume)

```typescript
// handlers/quiz-dm.ts
// In-memory map: userId -> true if currently awaiting open answer
const awaitingOpenAnswer = new Map<string, string>(); // userId -> questionId
const processingLocks = new Map<string, Promise<void>>();

export async function handleQuizDm(message: Message): Promise<void> {
  const userId = message.author.id;

  const existingLock = processingLocks.get(userId);
  const currentLock = (existingLock ?? Promise.resolve()).then(async () => {
    await processQuizDm(message);
  }).catch((err) => logger.error({ err, userId }, 'Quiz DM processing error'));

  processingLocks.set(userId, currentLock);
  currentLock.finally(() => {
    if (processingLocks.get(userId) === currentLock) processingLocks.delete(userId);
  });
}

async function processQuizDm(message: Message): Promise<void> {
  const userId = message.author.id;
  const student = await getStudentByDiscordId(userId);
  if (!student) return; // Not a student — ignore silently

  const session = await getActiveSessionByStudent(student.id);
  if (!session) return; // No active quiz — ignore silently

  if (session.status === 'not_started') {
    // New quiz arrived message — ignore text (student should click "Начать")
    return;
  }

  // Resume check (D-15, D-16)
  const questions = await getQuestionsByQuiz(session.quiz_id);
  const currentQ = questions[session.current_question];
  if (!currentQ) return;

  // Check if awaiting open answer
  const pendingQId = awaitingOpenAnswer.get(userId);
  if (pendingQId === currentQ.id && currentQ.type === 'open') {
    // Accept this message as the open answer (D-13, D-14)
    awaitingOpenAnswer.delete(userId);
    const studentAnswer = message.content.trim();

    // AI evaluation (D-18, D-19, D-20)
    const evalResult = await evaluateOpenAnswer(currentQ, studentAnswer);
    await saveAnswer({
      session_id: session.id,
      question_id: currentQ.id,
      student_answer: studentAnswer,
      is_correct: evalResult.isCorrect,
      ai_evaluation: evalResult,
    });

    await message.reply(evalResult.isCorrect ? '✅ Принято!' : '✅ Принято!');
    await advanceOrComplete(userId, session, questions);
  } else if (currentQ.type !== 'open') {
    // Student sent text while a button question is pending
    const dmChannel = message.channel;
    await dmChannel.send('Выберите ответ с помощью кнопок выше.');
  } else {
    // Resume: current question is open but awaitingOpenAnswer not set — re-send question
    const dmChannel = message.channel;
    await dmChannel.send(`Вы остановились на вопросе ${session.current_question + 1}/${questions.length}. Продолжаем!`);
    await sendQuestion(dmChannel, session, currentQ, questions.length);
    awaitingOpenAnswer.set(userId, currentQ.id);
  }
}
```

### Pattern 5: Question embed builder (pure function)

```typescript
// utils/quiz-messages.ts
export function buildQuestionEmbed(
  q: QuizQuestion,
  questionNumber: number,
  totalQuestions: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`Вопрос ${questionNumber}/${totalQuestions}`)
    .setDescription(q.question_text)
    .setColor(0x5865F2)
    .setFooter({ text: `Тип: ${q.type === 'mcq' ? 'Выбор ответа' : q.type === 'true_false' ? 'Правда/Ложь' : 'Открытый вопрос'}` });
}

export function buildMcqRow(sessionId: string, choices: Record<string, string>): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const [key, label] of Object.entries(choices)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`quiz_answer_${sessionId}_${key}`)
        .setLabel(`${key}: ${label}`)
        .setStyle(ButtonStyle.Primary)
    );
  }
  return row;
}

export function buildTrueFalseRow(sessionId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz_answer_${sessionId}_true`)
      .setLabel('Правда')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`quiz_answer_${sessionId}_false`)
      .setLabel('Ложь')
      .setStyle(ButtonStyle.Danger)
  );
}
```

### Pattern 6: Feedback message builder (D-21, D-22, D-23)

```typescript
// utils/quiz-messages.ts
const MAX_MSG_LEN = 2000;
const EXPLANATION_HARD_CUT = 120; // truncate per-explanation at this char count if needed

export function buildFeedbackMessage(
  answers: StudentQuizAnswer[],
  questions: QuizQuestion[],
  score: number
): string {
  const correct = answers.filter((a) => a.is_correct).length;
  const total = questions.length;
  const pct = Math.round(score);

  const header = `**Результат: ${correct}/${total} (${pct}%)**\n\n`;
  const lines: string[] = [];

  for (const q of questions) {
    const ans = answers.find((a) => a.question_id === q.id);
    if (!ans) { lines.push(`⬜ Вопрос ${q.question_number}: пропущен`); continue; }
    const mark = ans.is_correct ? '✅' : '❌';
    if (ans.is_correct) {
      lines.push(`${mark} **Q${q.question_number}:** ${ans.student_answer}`);
    } else {
      let expl = q.explanation ?? '';
      if (expl.length > EXPLANATION_HARD_CUT) expl = expl.slice(0, EXPLANATION_HARD_CUT) + '…';
      lines.push(`${mark} **Q${q.question_number}:** ${ans.student_answer}\n> Правильно: ${q.correct_answer}${expl ? `\n> ${expl}` : ''}`);
    }
  }

  const body = lines.join('\n');
  const full = header + body;
  // D-23: if over limit, truncate body at last newline within limit
  if (full.length <= MAX_MSG_LEN) return full;
  const limit = MAX_MSG_LEN - header.length - 3;
  return header + body.slice(0, limit) + '…';
}
```

### Pattern 7: Open answer AI evaluation (D-18, D-19, D-20)

```typescript
// utils/quiz-eval.ts
import { askClaude } from '@assistme/core';

interface EvalResult {
  isCorrect: boolean;
  reasoning: string;
}

export async function evaluateOpenAnswer(
  question: QuizQuestion,
  studentAnswer: string
): Promise<EvalResult> {
  const SYSTEM = `Ты — строгий, но справедливый преподаватель. Оценивай ответы студентов семантически: принимай синонимы, перефразировки и частичные совпадения если основная идея верна. Только полностью неверные или нерелевантные ответы считаются неправильными. Отвечай JSON: {"isCorrect": boolean, "reasoning": string}`;

  const prompt = `Вопрос: ${question.question_text}
Ожидаемый ответ: ${question.correct_answer}
Ответ студента: ${studentAnswer}

Правильный ли ответ студента? Ответь JSON.`;

  const raw = await askClaude({ prompt, systemPrompt: SYSTEM, model: 'sonnet', maxTokens: 256 });
  try {
    const parsed = JSON.parse(raw) as EvalResult;
    return { isCorrect: Boolean(parsed.isCorrect), reasoning: parsed.reasoning ?? '' };
  } catch {
    // Fallback: attempt simple contains check
    const isCorrect = studentAnswer.toLowerCase().includes(question.correct_answer.toLowerCase());
    return { isCorrect, reasoning: 'parsing fallback' };
  }
}
```

### Recommended Project Structure (Phase 10 additions)

```
packages/bot-discord-quiz/src/
├── index.ts                    MODIFY: add setupHandlers(client), add GuildMembers intent
├── handlers/
│   ├── index.ts               REPLACE placeholder: setupHandlers + registerButton
│   ├── quiz-start.ts          NEW: handles quiz_start_ interactions
│   ├── quiz-answer.ts         NEW: handles quiz_answer_ button clicks
│   └── quiz-dm.ts             NEW: handles DM text messages (open answers + resume)
└── utils/
    ├── quiz-messages.ts        NEW: embed/row/feedback builders (pure functions, testable)
    └── quiz-eval.ts            NEW: AI evaluation wrapper

packages/core/src/db/quiz/
├── questions.ts                NEW: getQuestionsByQuiz(quizId): Promise<QuizQuestion[]>
└── index.ts                    MODIFY: export * from './questions.js'
```

### Anti-Patterns to Avoid

- **Trusting in-memory state for resume:** The `awaitingOpenAnswer` map is only for the current session's open-question wait signal. The actual quiz position comes from `session.current_question` in DB. If the process restarts, the map is empty — the DM handler's resume path re-sends the current question correctly.
- **Using `awaitMessageComponent` for open answers:** This would block per-channel and hang after timeout. The global `messageCreate` + lock pattern handles concurrency correctly.
- **Importing from `@assistme/bot-discord`:** BOT-03 is a hard constraint. Reproduce the button handler registration pattern (20 lines) locally instead.
- **Not deferring button interactions:** Discord requires a reply within 3 seconds. Always call `interaction.deferReply()` or `interaction.deferUpdate()` at the top of every button handler before any DB call.
- **Sending feedback as multiple messages:** D-23 mandates a single message with truncation. Do not split.
- **Forgetting to disable buttons after answer:** After a student answers a QCM/V-F question, the bot must edit the original message to remove/disable buttons to prevent double-answering.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Student lookup by Discord ID | Custom query | `getStudentByDiscordId(userId)` from `@assistme/core` | Already exists, tested, handles null case |
| Session fetch | Custom query | `getActiveSessionByStudent(studentId)` from `@assistme/core` | Handles the `not_started OR in_progress` filter correctly |
| Answer persistence | Custom INSERT | `saveAnswer(params)` from `@assistme/core` | Handles logging, error propagation, all fields |
| Session status update | Custom UPDATE | `updateQuizSession(id, updates)` from `@assistme/core` | Handles logging, error propagation |
| AI evaluation | Direct Anthropic client | `askClaude({ prompt, systemPrompt, model: 'sonnet' })` from `@assistme/core` | Singleton client, logging, model mapping already handled |
| Score calculation | Float math | `(correctCount / totalQuestions) * 100` — same formula as `closeExpiredQuizSessions` | Consistency with existing score logic |
| Answers for feedback | Custom query | `getAnswersBySession(sessionId)` from `@assistme/core` | Already ordered by `answered_at ASC` |
| Concurrent message handling | Raw Promise chains | Per-user lock map pattern from `bot-discord/src/handlers/dm-handler.ts` | Prevents race conditions when student sends messages quickly |

---

## Common Pitfalls

### Pitfall 1: `interaction.deferReply()` timeout

**What goes wrong:** A DB call takes > 3 seconds before `interaction.reply()` is called — Discord shows "This interaction failed" and the handler's reply is silently discarded.

**Why it happens:** Discord's interaction token expires in 3 seconds. Any DB operation (especially `getQuestionsByQuiz` + `getQuizSession` serially) can exceed this.

**How to avoid:** Call `await interaction.deferReply({ ephemeral: true })` or `await interaction.deferUpdate()` as the FIRST line of every button handler, before any DB call. Then use `interaction.editReply()` or `interaction.followUp()` for the actual response.

**Warning signs:** "This interaction failed" message appears in Discord; handler logs show no errors.

### Pitfall 2: Double-answer race condition on QCM

**What goes wrong:** Student clicks A and B quickly (or network retries) — two `quiz_answer_` interactions fire for the same question. Both pass the `session.status === 'in_progress'` check before either writes. Two rows get inserted into `student_quiz_answers` for the same `(session_id, question_id)`.

**Why it happens:** No unique constraint on `(session_id, question_id)` in `student_quiz_answers` table.

**How to avoid:**
1. Disable buttons immediately after the first click (edit message with empty components array in `deferUpdate` + `editReply`).
2. In the handler, verify `current_question` matches the expected question index before saving. If `session.current_question` has already advanced, this is a stale interaction — ignore it.
3. Optionally: add a unique constraint migration on `(session_id, question_id)` if double-write risk is unacceptable.

**Warning signs:** `student_quiz_answers` has two rows for the same `(session_id, question_id)`.

### Pitfall 3: `GuildMembers` intent not added

**What goes wrong:** `getStudentByDiscordId(userId)` always returns null because the bot cannot resolve guild members — Discord does not send member data without the `GuildMembers` privileged intent.

**Why it happens:** Phase 8 scaffold intentionally used minimal intents (`Guilds` + `DirectMessages` only). `getStudentByDiscordId` queries Supabase by `discord_id`, but this is a string match — it works fine. However, if any code path tries to resolve a guild member via `guild.members.fetch()`, it requires the intent.

**Resolution:** The core function `getStudentByDiscordId` queries Supabase directly by `discord_id` string — this does NOT require `GuildMembers` intent. The intent is only needed if the bot calls `guild.members.fetch()`. Quiz bot handlers only use `interaction.user.id` and `message.author.id` — these are always available in DMs without `GuildMembers`. No intent change required for Phase 10.

**Warning signs:** `getStudentByDiscordId` returns null for all users.

### Pitfall 4: `awaitingOpenAnswer` map lost on resume

**What goes wrong:** Student starts an open question, bot sets `awaitingOpenAnswer.set(userId, questionId)`, then process restarts or bot crashes. On resume, map is empty. Next DM message does not trigger the open-answer path.

**Why it happens:** In-memory state is volatile.

**How to avoid:** The `quiz-dm.ts` handler must check `currentQ.type === 'open'` AND `awaitingOpenAnswer.get(userId) === currentQ.id`. The fallback `else` branch (resume path) handles the case where the map is empty but the question is open: it re-sends the question and re-sets the map entry. This is the correct behavior per D-15.

**Warning signs:** Student reports that after returning to DM, bot doesn't respond to their open answer text.

### Pitfall 5: `choices` JSONB shape assumptions

**What goes wrong:** `QuizQuestion.choices` is typed as `Record<string, unknown> | null`. Code tries to access `choices['A']` and TypeScript errors or runtime crashes if shape is `{ a: '...', b: '...' }` (lowercase) or `{ options: [...] }` (array).

**Why it happens:** The `choices` schema was defined as flexible JSONB with no enforced structure. The shape depends on how Phase 9 (quiz creation + parsing) populates it.

**How to avoid:** Phase 10 must define a type guard or Zod schema for the choices shape. Before implementing the button builder, read the Phase 9 plan to confirm the exact shape written by the TXT parser. If Phase 9 is not yet implemented, use a defensive `Object.entries(choices as Record<string, string>)` with a fallback.

**Warning signs:** `TypeError: Cannot convert undefined or null to object` in `buildMcqRow`.

### Pitfall 6: Feedback truncation cuts mid-character

**What goes wrong:** Truncating a multi-byte UTF-8 string (Russian text) at a byte index rather than character index produces garbled text at the cut point.

**Why it happens:** JavaScript strings are UTF-16, but `.slice()` operates on UTF-16 code units. Russian characters are 2-byte in UTF-8 but single code units in JS — this is actually fine. The pitfall is cutting in the middle of a Discord markdown format like `**` bold.

**How to avoid:** After truncating with `.slice(0, limit)`, check that the result does not end with an odd number of `*` characters. The simplest fix: truncate at the last `\n` before the limit, not at an exact char count.

---

## Code Examples

### Add getQuestionsByQuiz to core

```typescript
// Source: established pattern from packages/core/src/db/quiz/quizzes.ts
// packages/core/src/db/quiz/questions.ts (new file)
import { getSupabase } from '../client.js';
import type { QuizQuestion } from '../../types/index.js';
import { logger } from '../../logger.js';

const TABLE = 'quiz_questions';

export async function getQuestionsByQuiz(quizId: string): Promise<QuizQuestion[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('quiz_id', quizId)
    .order('question_number', { ascending: true });
  if (error) {
    logger.error({ error, quizId }, 'Failed to get questions by quiz');
    throw error;
  }
  return (data ?? []) as QuizQuestion[];
}
```

### Wire handlers in index.ts (existing entry point)

```typescript
// packages/bot-discord-quiz/src/index.ts — add after registerCronJobs:
import { setupHandlers } from './handlers/index.js';

client.once('ready', (readyClient) => {
  logger.info({ user: readyClient.user.tag, guildId }, 'TeacherBot is online');
  registerCronJobs(client, guildId);
  setupHandlers(client);     // ADD THIS LINE
});
```

### Advance-or-complete helper (shared by button and DM handlers)

```typescript
// handlers/quiz-start.ts or a shared utils/quiz-flow.ts
export async function advanceOrComplete(
  userId: string,
  session: StudentQuizSession,
  questions: QuizQuestion[],
  dmChannel: TextBasedChannel
): Promise<void> {
  const nextIndex = session.current_question + 1;

  if (nextIndex >= questions.length) {
    // Last question answered — complete
    const answers = await getAnswersBySession(session.id);
    const correctCount = answers.filter((a) => a.is_correct).length;
    const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    await updateQuizSession(session.id, {
      status: 'completed',
      score,
      completed_at: new Date().toISOString(),
    });

    const feedback = buildFeedbackMessage(answers, questions, score);
    await dmChannel.send(feedback);
  } else {
    // Advance to next question
    const updated = await updateQuizSession(session.id, {
      current_question: nextIndex,
    });
    const nextQ = questions[nextIndex];
    if (nextQ) await sendQuestion(dmChannel, updated, nextQ, questions.length);
  }
}
```

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a greenfield feature phase, not a rename/refactor/migration. No runtime state renaming involved.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | Runtime | ✓ | v24.14.0 | — |
| pnpm | Workspace | ✓ | 10.32.1 | — |
| discord.js ^14.16.0 | Bot client | ✓ (in package.json) | ^14.16.0 | — |
| @assistme/core workspace:* | DB + AI | ✓ | workspace | — |
| DISCORD_QUIZ_BOT_TOKEN | Bot login | Unknown — human action required in Phase 8 Task 3 | — | Blocking if not set |
| ANTHROPIC_API_KEY | AI evaluation | ✓ (set in .env) | — | — |
| Supabase local | Dev/test | ✓ | Running at 127.0.0.1:54321 | — |

**Missing dependencies with no fallback:**
- `DISCORD_QUIZ_BOT_TOKEN`: Phase 8 Task 3 was a human-action checkpoint — creating the Discord bot application. If the user has not completed this, the bot cannot connect. The Phase 10 plan must include a prerequisite check.

**Missing dependencies with fallback:**
- None.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `awaitMessageComponent` per message | Global `messageCreate` + per-user lock | Used since bot-discord Phase 6 | Prevents event loop blocking; survives restarts |
| Per-package vitest.config.ts | Root vitest.config.ts with projects | Phase 7 | All new test files go in `src/*.test.ts`, discovered automatically |
| CommonJS | ESM-only (`"type": "module"`) | Project start | All imports use `.js` extension; no `require()` |

**Deprecated/outdated:**
- GatewayIntentBits without explicit `Partials.Channel`: DMs won't be received without `Partials.Channel` — already set in Phase 8 scaffold, confirmed in `src/index.ts`.

---

## Open Questions

1. **Exact `choices` JSONB shape from Phase 9 TXT parser**
   - What we know: `QuizQuestion.choices` is `Record<string, unknown> | null`; QCM questions will have choices; V/F may have null choices or a `{true: 'Правда', false: 'Ложь'}` structure.
   - What's unclear: The exact key format (uppercase A/B/C/D vs lowercase a/b/c/d vs 1/2/3/4) depends on Phase 9's TXT parser implementation.
   - Recommendation: Phase 10 planner should mark Task 1 as "read Phase 9 quiz-create command source before coding button row builder" and use a defensive type cast. If Phase 9 is not complete, define the shape in this phase.

2. **`original_txt` column on the Quiz — is it populated by Phase 9?**
   - What we know: `DATA-06` required the column; `Quiz.original_txt` is typed as `string | null`.
   - What's unclear: Phase 9 (quiz creation/parsing) is the phase that populates `original_txt`. If Phase 9 is incomplete, `quiz_questions` rows may not exist, which would break Phase 10.
   - Recommendation: Phase 10 plan must include a prerequisite gate: "Phase 9 must be complete and at least one quiz with questions must exist in the DB before any Phase 10 handler can be tested."

3. **Session ID vs Quiz ID routing in `quiz_start_` customId**
   - What we know: D-09 says `quiz_start_` uses `session.id` (StudentQuizSession.id).
   - What's clear: This means `handleQuizStart` receives a session ID, loads the session to get `quiz_id`, then loads questions. This is the correct approach — confirmed by CONTEXT.md canonical refs.
   - No action needed.

---

## Sources

### Primary (HIGH confidence)

- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/handlers/dm-handler.ts` — lock pattern, DM processing, conversation serialization
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/handlers/button-handler.ts` — `registerButton` prefix routing pattern (20 lines, reproduce locally)
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/db/quiz/sessions.ts` — `getActiveSessionByStudent`, `updateQuizSession`, `getQuizSession`
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/db/quiz/answers.ts` — `saveAnswer`, `getAnswersBySession`
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/db/quiz/quizzes.ts` — `getQuiz`, confirms no `getQuestionsByQuiz` exists
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/types/index.ts` — `QuizQuestion`, `StudentQuizSession`, `StudentQuizAnswer` type definitions
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/core/src/ai/client.ts` — `askClaude` signature, model map (`'sonnet'` → `claude-sonnet-4-6`)
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord-quiz/src/index.ts` — current intents, entry point structure
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord-quiz/src/handlers/index.ts` — confirmed empty placeholder
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord-quiz/src/cron/close-expired-quizzes.ts` — score calculation pattern
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/vitest.config.ts` — `bot-discord-quiz` project already registered, env vars injected
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/packages/bot-discord/src/__mocks__/discord/builders.ts` — mock builder pattern for tests (`GuildMemberBuilder`, `MessageBuilder`, `ButtonInteractionBuilder`)
- `/Users/magomedsouleymanov/Documents/MAGA/MyProjects/vibe coder/.planning/phases/08-infrastructure/08-02-SUMMARY.md` — confirms Phase 8 scaffold state, Task 3 human-action blocker

### Secondary (MEDIUM confidence)

- `.planning/phases/10-student-quiz-experience/10-CONTEXT.md` — D-13 through D-23, session spec, canonical refs
- `.planning/phases/08-infrastructure/08-RESEARCH.md` — DB schema, migration 018, type definitions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions read directly from package.json files
- Architecture: HIGH — patterns read directly from dm-handler.ts and button-handler.ts source; no guessing
- Missing core function: HIGH — verified by grepping db/quiz/ directory; `getQuestionsByQuiz` definitively absent
- Pitfalls: HIGH — sourced from actual code patterns and Discord.js documented behavior
- Open questions: MEDIUM — choices JSONB shape depends on Phase 9 not yet implemented

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack; discord.js 14.x is LTS)
