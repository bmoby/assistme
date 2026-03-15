import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { searchStudentByName, getExercisesByStudent, updateExerciseStatus, createFormationEvent } from '@vibe-coder/core';
import { logger } from '@vibe-coder/core';
import { isAdmin } from '../../utils/auth.js';

export const revisionCommand = new SlashCommandBuilder()
  .setName('revision')
  .setDescription('[Admin] Запросить доработку задания')
  .addStringOption((opt) =>
    opt.setName('студент').setDescription('Имя студента').setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName('отзыв').setDescription('Подробный отзыв для студента').setRequired(true)
  );

export async function handleRevision(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Команда доступна только тренеру.', ephemeral: true });
    return;
  }

  const studentName = interaction.options.getString('студент', true);
  const feedback = interaction.options.getString('отзыв', true);

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
    await updateExerciseStatus(exercise.id, 'revision_needed', feedback);

    // DM the student
    if (student.discord_id) {
      try {
        const guild = interaction.guild;
        const member = await guild?.members.fetch(student.discord_id);
        if (member) {
          const dm = await member.createDM();
          await dm.send(
            `🔄 **Нужна доработка** — M${exercise.module}-З${exercise.exercise_number}\n\n` +
            `💬 Отзыв:\n${feedback}\n\n` +
            `Исправь и отправь заново через \`/submit\`.`
          );
        }
      } catch {
        logger.warn({ studentId: student.id }, 'Could not DM student for revision');
      }
    }

    await createFormationEvent({
      type: 'exercise_reviewed',
      source: 'discord',
      target: 'telegram-admin',
      data: { student_name: student.name, module: exercise.module, exercise_number: exercise.exercise_number, status: 'revision_needed' },
    });

    await interaction.reply({ content: `Доработка запрошена для M${exercise.module}-З${exercise.exercise_number} студента ${student.name}.`, ephemeral: true });
  } catch (error) {
    logger.error({ error, studentName }, 'Failed to request revision');
    await interaction.reply({ content: 'Ошибка при запросе доработки.', ephemeral: true });
  }
}
