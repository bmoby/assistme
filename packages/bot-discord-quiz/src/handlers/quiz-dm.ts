import type { Message, DMChannel, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import { getStudentByDiscordId, getActiveSessionByStudent, getQuestionsByQuiz, saveAnswer, logger } from '@assistme/core';
import { sendQuestion, advanceOrComplete } from '../utils/quiz-flow.js';
import { evaluateOpenAnswer } from '../utils/quiz-eval.js';

// Must match SendableChannel in quiz-flow.ts — excludes PartialGroupDMChannel which has no .send()
type SendableChannel = DMChannel | TextChannel | NewsChannel | ThreadChannel;

// In-memory state: tracks which userId is currently awaiting an open answer for which questionId
const awaitingOpenAnswer = new Map<string, string>(); // userId -> questionId

// Per-user lock to serialize concurrent DM messages (prevents race conditions)
const processingLocks = new Map<string, Promise<void>>();

export async function handleQuizDm(message: Message): Promise<void> {
  const userId = message.author.id;

  const existingLock = processingLocks.get(userId);
  const currentLock = (existingLock ?? Promise.resolve())
    .then(async () => {
      await processQuizDm(message);
    })
    .catch((err) => logger.error({ err, userId }, 'Quiz DM processing error'));

  processingLocks.set(userId, currentLock);
  void currentLock.finally(() => {
    if (processingLocks.get(userId) === currentLock) processingLocks.delete(userId);
  });
}

async function processQuizDm(message: Message): Promise<void> {
  const userId = message.author.id;

  // Lookup student by Discord ID — silently ignore non-registered users
  const student = await getStudentByDiscordId(userId);
  if (!student) return;

  // Check for active session — silently ignore if no quiz in progress
  const session = await getActiveSessionByStudent(student.id);
  if (!session) return;

  // Student should click Начать, not type
  if (session.status === 'not_started') return;

  const questions = await getQuestionsByQuiz(session.quiz_id);
  const currentQ = questions[session.current_question];
  if (!currentQ) return;

  const awaitingQuestionId = awaitingOpenAnswer.get(userId);

  if (awaitingQuestionId === currentQ.id && currentQ.type === 'open') {
    // Open answer path (D-13, D-14): student is providing their text answer
    awaitingOpenAnswer.delete(userId);

    const studentAnswer = message.content.trim();

    // AI evaluation (D-18, D-19, D-20): semantic match via Claude
    const evalResult = await evaluateOpenAnswer(currentQ, studentAnswer);

    await saveAnswer({
      session_id: session.id,
      question_id: currentQ.id,
      student_answer: studentAnswer,
      is_correct: evalResult.isCorrect,
      ai_evaluation: evalResult as unknown as Record<string, unknown>,
    });

    await message.reply('Ответ принят!');

    logger.info(
      { userId, sessionId: session.id, questionIndex: session.current_question, isCorrect: evalResult.isCorrect },
      'Open answer recorded'
    );

    const channel = message.channel as SendableChannel;
    const updatedSession = await advanceOrComplete(userId, session, questions, channel);

    // If quiz not complete and next question is open type, set awaiting state for it
    if (updatedSession !== null) {
      const nextQ = questions[updatedSession.current_question];
      if (nextQ && nextQ.type === 'open') {
        awaitingOpenAnswer.set(userId, nextQ.id);
      }
    }
    return;
  }

  if (currentQ.type !== 'open') {
    // Button question text guard: student typed during a button question
    await (message.channel as SendableChannel).send('Выберите ответ с помощью кнопок выше.');
    return;
  }

  // Resume path (D-15, D-16): open question but awaitingOpenAnswer not set
  // This happens when student returns hours later and types a message
  const channel = message.channel as SendableChannel;
  await channel.send(`Вы остановились на вопросе ${session.current_question + 1}/${questions.length}. Продолжаем!`);
  await sendQuestion(channel, session, currentQ, questions.length);
  awaitingOpenAnswer.set(userId, currentQ.id);
}

// Test helpers — exported for unit test access only
export function _getAwaitingOpenAnswer(): Map<string, string> {
  return awaitingOpenAnswer;
}

export function _clearStateForTesting(): void {
  awaitingOpenAnswer.clear();
  processingLocks.clear();
}
