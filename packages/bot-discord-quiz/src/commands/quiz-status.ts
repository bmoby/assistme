import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { logger, getQuizBySession, getSessionsByQuiz, getActiveStudents } from '@assistme/core';
import type { StudentQuizSession, Student } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';

// ============================================
// Slash command definition
// ============================================

export const quizStatusCommand = new SlashCommandBuilder()
  .setName('quiz-status')
  .setDescription('Voir l\'etat d\'un quiz pour une session')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption((opt) =>
    opt.setName('session').setDescription('Numero de session').setRequired(true)
  );

// ============================================
// Constants
// ============================================

const FIELD_VALUE_LIMIT = 1024;
const BLURPLE = 0x5865F2;

// ============================================
// Helpers
// ============================================

function studentDisplayName(student: Student): string {
  return student.name;
}

function buildStudentListField(
  students: Array<{ student: Student; suffix: string }>,
): string {
  const lines: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < students.length; i++) {
    const entry = students[i]!;
    const line = `${studentDisplayName(entry.student)} \u2014 ${entry.suffix}`;
    const lineWithNewline = line + '\n';

    if (currentLength + lineWithNewline.length > FIELD_VALUE_LIMIT - 30) {
      const remaining = students.length - i;
      lines.push(`*(+ ${remaining} autres)*`);
      break;
    }

    lines.push(line);
    currentLength += lineWithNewline.length;
  }

  return lines.join('\n') || '\u200b';
}

// ============================================
// Main handler
// ============================================

export async function handleQuizStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  // Auth check
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Commande reservee au formateur.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const sessionNumber = interaction.options.getInteger('session', true);

  // Step 1: Get quiz
  const quiz = await getQuizBySession(sessionNumber);
  if (!quiz) {
    await interaction.editReply(`Aucun quiz actif pour la session ${sessionNumber}.`);
    return;
  }

  // Step 2: Get sessions and active students in parallel
  const [quizSessions, activeStudents] = await Promise.all([
    getSessionsByQuiz(quiz.id),
    getActiveStudents(),
  ]);

  // Step 3: Build lookup maps
  const studentMap = new Map<string, Student>(activeStudents.map((s) => [s.id, s]));
  const sessionByStudent = new Map<string, StudentQuizSession>(
    quizSessions.map((qs) => [qs.student_id, qs]),
  );

  // Step 4: Categorize
  const completed: Array<{ student: Student; suffix: string }> = [];
  const inProgress: Array<{ student: Student; suffix: string }> = [];
  const expiredIncomplete: Array<{ student: Student; suffix: string }> = [];
  const notStarted: Array<{ student: Student; suffix: string }> = [];

  // Process sessions that exist
  for (const qs of quizSessions) {
    const student = studentMap.get(qs.student_id);
    if (!student) continue; // student no longer active or not found

    switch (qs.status) {
      case 'completed':
        completed.push({ student, suffix: `${qs.score ?? 0}%` });
        break;
      case 'in_progress':
        inProgress.push({ student, suffix: 'en cours' });
        break;
      case 'expired_incomplete':
        expiredIncomplete.push({ student, suffix: `expire (${qs.score ?? 0}%)` });
        break;
      case 'not_started':
        notStarted.push({ student, suffix: 'pas commence' });
        break;
    }
  }

  // Active students who have no quiz session at all
  for (const student of activeStudents) {
    if (!sessionByStudent.has(student.id)) {
      notStarted.push({ student, suffix: 'pas commence' });
    }
  }

  const notStartedCount = notStarted.length;
  const completedCount = completed.length;
  const inProgressCount = inProgress.length;

  // Step 5: Build embed
  const embed = new EmbedBuilder()
    .setTitle(`Statut Quiz \u2014 Session ${sessionNumber}`)
    .setColor(BLURPLE);

  // Counter fields (inline)
  embed.addFields(
    { name: 'Termines', value: `${completedCount}`, inline: true },
    { name: 'En cours', value: `${inProgressCount}`, inline: true },
    { name: 'Pas commence', value: `${notStartedCount}`, inline: true },
    { name: 'Non livre', value: '0', inline: true },
  );

  // Detail fields (non-inline, omitted if empty)
  if (completed.length > 0) {
    embed.addFields({
      name: 'Termines',
      value: buildStudentListField(completed),
      inline: false,
    });
  }

  if (inProgress.length > 0) {
    embed.addFields({
      name: 'En cours',
      value: buildStudentListField(inProgress),
      inline: false,
    });
  }

  if (notStarted.length > 0) {
    embed.addFields({
      name: 'Pas commence',
      value: buildStudentListField(notStarted),
      inline: false,
    });
  }

  if (expiredIncomplete.length > 0) {
    embed.addFields({
      name: 'Expires',
      value: buildStudentListField(expiredIncomplete),
      inline: false,
    });
  }

  // Step 6: Reply
  await interaction.editReply({ embeds: [embed] });

  logger.info(
    { quizId: quiz.id, sessionNumber, completedCount, inProgressCount, notStartedCount },
    'Quiz status displayed',
  );
}
