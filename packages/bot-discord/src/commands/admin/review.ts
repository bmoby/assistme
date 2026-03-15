import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { searchStudentByName, getExercisesByStudent } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';
import { formatExerciseEmbed } from '../../utils/format.js';

export const reviewCommand = new SlashCommandBuilder()
  .setName('review')
  .setDescription('[Admin] Задания студента на проверку')
  .addStringOption((opt) =>
    opt.setName('студент').setDescription('Имя студента').setRequired(true)
  );

export async function handleReview(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const studentName = interaction.options.getString('студент', true);

  try {
    const students = await searchStudentByName(studentName);
    if (students.length === 0) {
      await interaction.reply({ content: `Студент «${studentName}» не найден.`, ephemeral: true });
      return;
    }

    const student = students[0]!;
    const exercises = await getExercisesByStudent(student.id);
    const pending = exercises.filter((e) => e.status === 'submitted' || e.status === 'ai_reviewed');

    if (pending.length === 0) {
      await interaction.reply({ content: `У ${student.name} нет заданий на проверку.`, ephemeral: true });
      return;
    }

    const embeds = pending.slice(0, 5).map((e) => formatExerciseEmbed(e, student.name));
    await interaction.reply({ content: `**${pending.length} задание(й) на проверку у ${student.name}:**`, embeds, ephemeral: true });
  } catch (error) {
    logger.error({ error, studentName }, 'Failed to review student exercises');
    await interaction.reply({ content: 'Ошибка при получении заданий.', ephemeral: true });
  }
}
