import type { ButtonInteraction } from 'discord.js';
import { getQuizSession, getQuestionsByQuiz, saveAnswer, logger } from '@assistme/core';
import { advanceOrComplete } from '../utils/quiz-flow.js';

export async function handleQuizAnswer(interaction: ButtonInteraction): Promise<void> {
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
