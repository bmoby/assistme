import type { Message, DMChannel, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import { getStudentByDiscordId, getActiveSessionByStudent, getQuestionsByQuiz, saveAnswer, logger } from '@assistme/core';
import { advanceOrComplete } from '../utils/quiz-flow.js';
import { evaluateOpenAnswer } from '../utils/quiz-eval.js';

// Must match SendableChannel in quiz-flow.ts — excludes PartialGroupDMChannel which has no .send()
type SendableChannel = DMChannel | TextChannel | NewsChannel | ThreadChannel;

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

  if (currentQ.type !== 'open') {
    // Button question text guard: student typed during a button question
    await (message.channel as SendableChannel).send('Выберите ответ с помощью кнопок выше.');
    return;
  }

  // Open answer path: any text message during an open question = answer
  const studentAnswer = message.content.trim();

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
  await advanceOrComplete(userId, session, questions, channel);
}

// Test helpers — exported for unit test access only
export function _clearStateForTesting(): void {
  processingLocks.clear();
}
