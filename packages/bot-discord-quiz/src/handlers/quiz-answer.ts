import type { ButtonInteraction } from 'discord.js';
import { getQuizSession, getQuestionsByQuiz, getStudentByDiscordId, saveAnswer, logger } from '@assistme/core';
import { advanceOrComplete } from '../utils/quiz-flow.js';

// Per-user lock to serialize concurrent button clicks (prevents race conditions)
const processingLocks = new Map<string, Promise<void>>();

export async function handleQuizAnswer(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;

  const existingLock = processingLocks.get(userId);
  const currentLock = (existingLock ?? Promise.resolve())
    .then(async () => {
      await processQuizAnswer(interaction);
    })
    .catch((err) => logger.error({ err, userId }, 'Quiz answer processing error'));

  processingLocks.set(userId, currentLock);
  void currentLock.finally(() => {
    if (processingLocks.get(userId) === currentLock) processingLocks.delete(userId);
  });
}

async function processQuizAnswer(interaction: ButtonInteraction): Promise<void> {
  // Must defer before any DB call — prevents "interaction failed" and disables buttons visually
  await interaction.deferUpdate();

  const withoutPrefix = interaction.customId.replace('quiz_answer_', '');
  // Split at first underscore to separate sessionId from choice
  const separatorIdx = withoutPrefix.indexOf('_');
  const sessionId = withoutPrefix.slice(0, separatorIdx);
  const choice = withoutPrefix.slice(separatorIdx + 1);

  const session = await getQuizSession(sessionId);

  if (!session || session.status !== 'in_progress') {
    await interaction.followUp({ content: 'Сессия квиза не активна.', ephemeral: true });
    return;
  }

  // Ownership check — verify the Discord user matches the session's student
  const student = await getStudentByDiscordId(interaction.user.id);
  if (!student || student.id !== session.student_id) {
    await interaction.followUp({ content: 'Этот квиз вам не назначен.', ephemeral: true });
    return;
  }

  const questions = await getQuestionsByQuiz(session.quiz_id);
  const currentQ = questions[session.current_question];

  // Stale interaction guard — silently ignore if question not found
  if (!currentQ) {
    return;
  }

  // EVAL-01 / EVAL-02: exact match for mcq and true_false
  const isCorrect = choice === currentQ.correct_answer;

  await saveAnswer({
    session_id: session.id,
    question_id: currentQ.id,
    student_answer: choice,
    is_correct: isCorrect,
    ai_evaluation: null,
  });

  // Disable buttons on the answered message
  await interaction.editReply({ components: [] });

  const dmChannel = await interaction.user.createDM();

  logger.info(
    { userId: interaction.user.id, sessionId: session.id, questionIndex: session.current_question, choice, isCorrect },
    'Quiz answer recorded'
  );

  await advanceOrComplete(interaction.user.id, session, questions, dmChannel);
}

// Test helpers — exported for unit test access only
export function _clearStateForTesting(): void {
  processingLocks.clear();
}
