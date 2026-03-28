import type { ButtonInteraction } from 'discord.js';
import { getQuizSession, getStudentByDiscordId, updateQuizSession, getQuestionsByQuiz, logger } from '@assistme/core';
import { sendQuestion } from '../utils/quiz-flow.js';

export async function handleQuizStart(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const sessionId = interaction.customId.replace('quiz_start_', '');

  const session = await getQuizSession(sessionId);

  if (!session) {
    await interaction.editReply({ content: 'Квиз не найден.' });
    return;
  }

  // Ownership check — verify the Discord user matches the session's student
  const student = await getStudentByDiscordId(interaction.user.id);
  if (!student || student.id !== session.student_id) {
    await interaction.editReply({ content: 'Этот квиз вам не назначен.' });
    return;
  }

  // QUIZ-08: one-shot enforcement — completed quiz cannot be retaken
  if (session.status === 'completed') {
    await interaction.editReply({ content: 'Этот квиз уже завершён. Повторное прохождение недоступно.' });
    return;
  }

  if (session.status === 'expired_incomplete') {
    await interaction.editReply({ content: 'Время для этого квиза истекло.' });
    return;
  }

  if (session.status === 'in_progress') {
    // Resume path — student is returning to an in-progress quiz
    const questions = await getQuestionsByQuiz(session.quiz_id);
    const currentQ = questions[session.current_question];

    if (!currentQ) {
      await interaction.editReply({ content: 'Ошибка: вопрос не найден.' });
      return;
    }

    await interaction.editReply({ content: 'Продолжаем квиз!' });

    const dmChannel = await interaction.user.createDM();

    // D-15: resume recap message
    await dmChannel.send(`Вы остановились на вопросе ${session.current_question + 1}/${questions.length}. Продолжаем!`);
    await sendQuestion(dmChannel, session, currentQ, questions.length);
    return;
  }

  // Start path (status === 'not_started')
  const updated = await updateQuizSession(session.id, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });

  let questions;
  try {
    questions = await getQuestionsByQuiz(session.quiz_id);
  } catch (err) {
    // Revert session status to prevent stuck state
    await updateQuizSession(session.id, { status: 'not_started', started_at: null }).catch(() => {});
    logger.error({ err, sessionId: session.id }, 'Failed to fetch questions after starting quiz');
    await interaction.editReply({ content: 'Ошибка при загрузке вопросов. Попробуйте ещё раз.' });
    return;
  }

  const firstQuestion = questions[0];

  if (!firstQuestion) {
    await interaction.editReply({ content: 'Вопросы не найдены. Обратитесь к преподавателю.' });
    return;
  }

  await interaction.editReply({ content: 'Квиз начат! Проверьте личные сообщения.' });

  const dmChannel = await interaction.user.createDM();
  await sendQuestion(dmChannel, updated, firstQuestion, questions.length);

  logger.info(
    { userId: interaction.user.id, sessionId: session.id, questionCount: questions.length },
    'Quiz started'
  );
}
