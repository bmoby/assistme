import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { searchStudentByName, getExercisesByStudent, updateExerciseStatus } from '@assistme/core';
import { logger } from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';

export const approveCommand = new SlashCommandBuilder()
  .setName('approve')
  .setDescription('[Admin] Одобрить задание студента')
  .addStringOption((opt) =>
    opt.setName('студент').setDescription('Имя студента').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('отзыв').setDescription('Отзыв (необязательно)').setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt.setName('сессия').setDescription('Номер сессии (если несколько заданий)').setRequired(false)
  );

export async function handleApprove(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const studentName = interaction.options.getString('студент', true);
  const feedback = interaction.options.getString('отзыв');
  const sessionFilter = interaction.options.getInteger('сессия');

  try {
    const students = await searchStudentByName(studentName);
    if (students.length === 0) {
      await interaction.reply({ content: `Студент «${studentName}» не найден.`, ephemeral: true });
      return;
    }

    const student = students[0]!;
    const exercises = await getExercisesByStudent(student.id);
    let pending = exercises.filter((e) => e.status === 'submitted');

    if (pending.length === 0) {
      await interaction.reply({ content: `У ${student.name} нет заданий на проверку.`, ephemeral: true });
      return;
    }

    if (sessionFilter !== null) {
      pending = pending.filter((e) => e.exercise_number === sessionFilter);
      if (pending.length === 0) {
        await interaction.reply({ content: `У ${student.name} нет задания на проверку для сессии ${sessionFilter}.`, ephemeral: true });
        return;
      }
    }

    if (pending.length > 1 && sessionFilter === null) {
      const list = pending.map((e) => `• M${e.module}-З${e.exercise_number}`).join('\n');
      await interaction.reply({ content: `У ${student.name} несколько заданий на проверку:\n${list}\n\nУкажи параметр \`сессия\` для выбора.`, ephemeral: true });
      return;
    }

    const exercise = pending[0]!;
    await updateExerciseStatus(exercise.id, 'approved', feedback ?? undefined);

    // DM the student
    if (student.discord_id) {
      try {
        const guild = interaction.guild;
        const member = await guild?.members.fetch(student.discord_id);
        if (member) {
          const dm = await member.createDM();
          await dm.send(
            `✅ **Задание одобрено!** M${exercise.module}-З${exercise.exercise_number}\n` +
            (feedback ? `\n💬 Отзыв: ${feedback}` : '\nХорошая работа!')
          );
        }
      } catch {
        logger.warn({ studentId: student.id }, 'Could not DM student for approval');
      }
    }

    await interaction.reply({ content: `Задание M${exercise.module}-З${exercise.exercise_number} студента ${student.name} одобрено.`, ephemeral: true });
  } catch (error) {
    logger.error({ error, studentName }, 'Failed to approve exercise');
    await interaction.reply({ content: 'Ошибка при одобрении задания.', ephemeral: true });
  }
}
