import { EmbedBuilder } from 'discord.js';
import type { Student, StudentExercise } from '@assistme/core';

const STATUS_EMOJI: Record<string, string> = {
  interested: '⚪',
  registered: '🔵',
  paid: '🟢',
  active: '🟢',
  completed: '🏆',
  dropped: '🔴',
  submitted: '📩',
  ai_reviewed: '🤖',
  reviewed: '👁️',
  approved: '✅',
  revision_needed: '🔄',
};

export function formatStudentEmbed(student: Student): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${STATUS_EMOJI[student.status] ?? '⚪'} ${student.name}`)
    .addFields(
      { name: 'Статус', value: student.status, inline: true },
      { name: 'Оплата', value: student.payment_status, inline: true },
      { name: 'Под', value: student.pod_id ? `Под ${student.pod_id}` : 'Не назначен', inline: true },
    )
    .setColor(student.status === 'active' ? 0x00ff00 : 0x808080)
    .setTimestamp();
}

export function formatExerciseEmbed(exercise: StudentExercise, studentName?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${STATUS_EMOJI[exercise.status] ?? '📩'} Задание M${exercise.module}-З${exercise.exercise_number}`)
    .addFields(
      { name: 'Статус', value: exercise.status, inline: true },
      { name: 'Отправлено', value: new Date(exercise.submitted_at).toLocaleDateString('ru-RU'), inline: true },
    )
    .setColor(exercise.status === 'approved' ? 0x00ff00 : exercise.status === 'revision_needed' ? 0xff0000 : 0xffaa00)
    .setTimestamp();

  if (studentName) embed.addFields({ name: 'Студент', value: studentName, inline: true });
  if (exercise.submission_url) embed.addFields({ name: 'Ссылка', value: exercise.submission_url });
  if (exercise.feedback) embed.addFields({ name: 'Отзыв', value: exercise.feedback.slice(0, 1024) });

  return embed;
}

export function formatProgressEmbed(
  student: Student,
  exercises: StudentExercise[]
): EmbedBuilder {
  const approved = exercises.filter((e) => e.status === 'approved').length;
  const pending = exercises.filter((e) => e.status === 'submitted' || e.status === 'ai_reviewed').length;
  const revision = exercises.filter((e) => e.status === 'revision_needed').length;

  const progressBar = (count: number, total: number): string => {
    if (total === 0) return 'Нет сданных заданий';
    const filled = Math.round((count / total) * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${count}/${total}`;
  };

  return new EmbedBuilder()
    .setTitle(`📊 Прогресс: ${student.name}`)
    .addFields(
      { name: '✅ Одобрено', value: progressBar(approved, exercises.length), inline: false },
      { name: '📩 На проверке', value: String(pending), inline: true },
      { name: '🔄 На доработке', value: String(revision), inline: true },
      { name: '📚 Всего сдано', value: String(exercises.length), inline: true },
    )
    .setColor(0x5865f2)
    .setTimestamp();
}
