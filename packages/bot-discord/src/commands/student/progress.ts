import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getExercisesByStudent } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { isStudent, getStudentFromInteraction } from '../../utils/auth.js';
import { formatProgressEmbed } from '../../utils/format.js';
import { ROLES } from '../../config.js';

export const progressCommand = new SlashCommandBuilder()
  .setName('progress')
  .setDescription('Мой прогресс');

export async function handleProgress(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isStudent(interaction)) {
    await interaction.reply({ content: `Чтобы увидеть прогресс, нужна роль @${ROLES.student}.`, ephemeral: true });
    return;
  }

  const student = await getStudentFromInteraction(interaction);
  if (!student) {
    await interaction.reply({ content: 'Аккаунт студента не найден. Обратись к тренеру.', ephemeral: true });
    return;
  }

  try {
    const exercises = await getExercisesByStudent(student.id);
    const embed = formatProgressEmbed(student, exercises);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logger.error({ error, studentId: student.id }, 'Failed to get progress');
    await interaction.reply({ content: 'Ошибка при получении прогресса.', ephemeral: true });
  }
}
