import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { submitExercise, createFormationEvent, reviewExercise, setAiReview } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { isStudent, getStudentFromInteraction } from '../../utils/auth.js';
import { formatExerciseEmbed } from '../../utils/format.js';
import { ROLES } from '../../config.js';

export const submitCommand = new SlashCommandBuilder()
  .setName('submit')
  .setDescription('Сдать задание')
  .addStringOption((opt) =>
    opt.setName('ссылка').setDescription('Ссылка на работу (URL)').setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName('модуль').setDescription('Номер модуля (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)
  )
  .addIntegerOption((opt) =>
    opt.setName('задание').setDescription('Номер задания').setRequired(true).setMinValue(1)
  );

export async function handleSubmit(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isStudent(interaction)) {
    await interaction.reply({ content: `Чтобы сдать задание, нужна роль @${ROLES.student}.`, ephemeral: true });
    return;
  }

  const student = await getStudentFromInteraction(interaction);
  if (!student) {
    await interaction.reply({ content: 'Аккаунт студента не найден. Обратись к тренеру.', ephemeral: true });
    return;
  }

  const link = interaction.options.getString('ссылка', true);
  const module = interaction.options.getInteger('модуль', true);
  const exerciseNumber = interaction.options.getInteger('задание', true);

  await interaction.deferReply();

  try {
    const exercise = await submitExercise({
      student_id: student.id,
      module,
      exercise_number: exerciseNumber,
      submission_url: link,
    });

    const embed = formatExerciseEmbed(exercise, student.name);
    await interaction.editReply({ content: `Задание получено! ИИ-проверка запущена...`, embeds: [embed] });

    // AI review in background (don't block the response)
    reviewExercise({
      submissionUrl: link,
      module,
      exerciseNumber,
      studentName: student.name,
    })
      .then(async (review) => {
        await setAiReview(exercise.id, review as unknown as Record<string, unknown>);

        // DM the student with AI feedback
        try {
          const dm = await interaction.user.createDM();
          await dm.send(
            `**ИИ-проверка — M${module}-З${exerciseNumber}**\n\n` +
            `Оценка: ${review.score}/10\n` +
            `${review.summary}\n\n` +
            `Тренер завершит проверку.`
          );
        } catch {
          logger.warn({ studentId: student.id }, 'Could not DM student with review');
        }

        // Create event for Telegram admin digest
        await createFormationEvent({
          type: 'exercise_submitted',
          source: 'discord',
          target: 'telegram-admin',
          data: {
            student_name: student.name,
            module,
            exercise_number: exerciseNumber,
            submission_url: link,
            ai_score: review.score,
            ai_recommendation: review.recommendation,
          },
        });
      })
      .catch((err) => {
        logger.error({ err, exerciseId: exercise.id }, 'Background AI review failed');
      });
  } catch (error) {
    logger.error({ error, studentId: student.id }, 'Failed to submit exercise');
    await interaction.editReply('Ошибка при отправке. Попробуй ещё раз или обратись к тренеру.');
  }
}
