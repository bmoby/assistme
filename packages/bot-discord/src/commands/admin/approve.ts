import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { searchStudentByName, getExercisesByStudent, updateExerciseStatus, createFormationEvent } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';

export const approveCommand = new SlashCommandBuilder()
  .setName('approve')
  .setDescription('[Admin] Одобрить задание студента')
  .addStringOption((opt) =>
    opt.setName('студент').setDescription('Имя студента').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('отзыв').setDescription('Отзыв (необязательно)').setRequired(false)
  );

export async function handleApprove(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const studentName = interaction.options.getString('студент', true);
  const feedback = interaction.options.getString('отзыв');

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

    await createFormationEvent({
      type: 'exercise_reviewed',
      source: 'discord',
      target: 'telegram-admin',
      data: { student_name: student.name, module: exercise.module, exercise_number: exercise.exercise_number, status: 'approved' },
    });

    await interaction.reply({ content: `Задание M${exercise.module}-З${exercise.exercise_number} студента ${student.name} одобрено.`, ephemeral: true });
  } catch (error) {
    logger.error({ error, studentName }, 'Failed to approve exercise');
    await interaction.reply({ content: 'Ошибка при одобрении задания.', ephemeral: true });
  }
}
