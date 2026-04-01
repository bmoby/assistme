import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  searchStudentByName,
  getExercisesByStudent,
  getAttachmentsByExercise,
  getPendingExercises,
  getPendingExercisesBySession,
  getSessionByNumber,
  getStudent,
} from '@assistme/core';
import type { StudentExercise } from '@assistme/core';
import { logger } from '@assistme/core';
import { isAdmin, isMentor } from '../../utils/auth.js';
import { formatExerciseEmbed } from '../../utils/format.js';

export const reviewCommand = new SlashCommandBuilder()
  .setName('review')
  .setDescription('[Admin/Mentor] Exercices en attente de review')
  .addStringOption((opt) =>
    opt.setName('студент').setDescription('Имя студента').setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt.setName('сессия').setDescription('Номер сессии').setRequired(false)
  );

export async function handleReview(interaction: ChatInputCommandInteraction): Promise<void> {
  const admin = isAdmin(interaction);
  const mentor = isMentor(interaction);

  if (!admin && !mentor) {
    await interaction.reply({ content: 'Команда доступна тренеру и менторам.', ephemeral: true });
    return;
  }

  const studentName = interaction.options.getString('студент');
  const sessionNumber = interaction.options.getInteger('сессия');

  await interaction.deferReply({ ephemeral: true });

  try {
    if (sessionNumber) {
      await handleReviewBySession(interaction, sessionNumber);
    } else if (studentName) {
      await handleReviewByStudent(interaction, studentName, admin);
    } else {
      await handleReviewGlobal(interaction);
    }
  } catch (error) {
    logger.error({ error, studentName, sessionNumber }, 'Failed to review exercises');
    await interaction.editReply({ content: 'Ошибка при получении заданий.' });
  }
}

// ============================================
// /review сессия:X — exercises for a specific session
// ============================================

async function handleReviewBySession(
  interaction: ChatInputCommandInteraction,
  sessionNumber: number
): Promise<void> {
  const session = await getSessionByNumber(sessionNumber);
  const pending = await getPendingExercisesBySession(sessionNumber);

  if (pending.length === 0) {
    await interaction.editReply({ content: `Нет заданий на проверку для сессии ${sessionNumber}.` });
    return;
  }

  // Resolve student names
  const studentNames = new Map<string, string>();
  for (const ex of pending) {
    if (!studentNames.has(ex.student_id)) {
      const student = await getStudent(ex.student_id);
      studentNames.set(ex.student_id, student?.name ?? 'Inconnu');
    }
  }

  const sessionTitle = session ? `${session.session_number} — ${session.title}` : `Session ${sessionNumber}`;

  // Build embed
  const lines = pending.map((ex) => {
    const name = studentNames.get(ex.student_id) ?? 'Inconnu';
    const resubLabel = ex.submission_count > 1 ? ` (#${ex.submission_count})` : '';
    return `📩 **${name}**${resubLabel}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`📋 Exercices — ${sessionTitle}`)
    .setDescription(`**En attente de review : ${pending.length}**\n\n${lines.join('\n')}`)
    .setColor(0x5865f2)
    .setTimestamp();

  // Build buttons (max 5 per row, max 5 rows = 25)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const displayed = pending.slice(0, 25);

  for (let i = 0; i < displayed.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const ex of displayed.slice(i, i + 5)) {
      const name = studentNames.get(ex.student_id) ?? '?';
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`review_open_${ex.id}`)
          .setLabel(name.slice(0, 20))
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝')
      );
    }
    rows.push(row);
  }

  await interaction.editReply({ embeds: [embed], components: rows });
}

// ============================================
// /review студент:X — exercises for a specific student
// ============================================

async function handleReviewByStudent(
  interaction: ChatInputCommandInteraction,
  studentName: string,
  isAdminUser: boolean
): Promise<void> {
  const students = await searchStudentByName(studentName);
  if (students.length === 0) {
    await interaction.editReply({ content: `Студент «${studentName}» не найден.` });
    return;
  }

  const student = students[0]!;
  const exercises = await getExercisesByStudent(student.id);
  const pending = exercises.filter((e) => e.status === 'submitted');

  if (pending.length === 0) {
    await interaction.editReply({ content: `У ${student.name} нет заданий на проверку.` });
    return;
  }

  const displayed = pending.slice(0, 5);
  const attachmentsMap = await Promise.all(
    displayed.map(async (e) => {
      try {
        return await getAttachmentsByExercise(e.id);
      } catch {
        return [];
      }
    })
  );
  const embeds = displayed.map((e, i) => formatExerciseEmbed(e, student.name, attachmentsMap[i]));

  // Add review buttons
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (isAdminUser) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const ex of displayed) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`review_open_${ex.id}`)
          .setLabel(`S${ex.exercise_number}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝')
      );
    }
    rows.push(row);
  }

  await interaction.editReply({
    content: `**${pending.length} задание(й) на проверку у ${student.name}** :`,
    embeds,
    components: rows,
  });
}

// ============================================
// /review (no args) — global overview grouped by session
// ============================================

async function handleReviewGlobal(interaction: ChatInputCommandInteraction): Promise<void> {
  const pending = await getPendingExercises();

  if (pending.length === 0) {
    await interaction.editReply({ content: 'Нет заданий на проверку.' });
    return;
  }

  // Group by session (exercise_number = session_number)
  const bySession = new Map<number, StudentExercise[]>();
  for (const ex of pending) {
    const sn = ex.exercise_number;
    if (!bySession.has(sn)) bySession.set(sn, []);
    bySession.get(sn)!.push(ex);
  }

  const lines: string[] = [];
  for (const [sn, exercises] of [...bySession.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`**Session ${sn}** : ${exercises.length} soumission(s)`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Exercices en attente — ${pending.length} total`)
    .setDescription(lines.join('\n'))
    .setColor(0x5865f2)
    .setTimestamp();

  // Buttons per session
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const sessions = [...bySession.keys()].sort((a, b) => a - b).slice(0, 25);

  for (let i = 0; i < sessions.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const sn of sessions.slice(i, i + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`review_session_${sn}`)
          .setLabel(`Session ${sn}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📋')
      );
    }
    rows.push(row);
  }

  await interaction.editReply({ embeds: [embed], components: rows });
}
