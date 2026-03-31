import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  logger,
  getExercise,
  getSession,
  getStudent,
  getSessionByNumber,
  getPendingExercisesBySession,
  updateExerciseStatus,
  updateExercise,
} from '@assistme/core';
import type { ExerciseStatus } from '@assistme/core';
import { registerButton } from './button-handler.js';
import { createReviewThread } from '../utils/review-thread.js';
import { formatStudentFeedbackDM, formatSubmissionNotification } from '../utils/format.js';
import { CHANNELS } from '../config.js';

/**
 * Register all review-related button handlers.
 */
export function registerReviewButtons(): void {
  registerButton('review_open_', handleReviewOpen);
  registerButton('review_approve_', handleReviewDecision);
  registerButton('review_revision_', handleReviewDecision);
  registerButton('review_session_', handleReviewSession);
}

// ============================================
// Open review thread
// ============================================

async function handleReviewOpen(interaction: ButtonInteraction): Promise<void> {
  const exerciseId = interaction.customId.replace('review_open_', '');

  await interaction.deferReply({ ephemeral: true });

  const exercise = await getExercise(exerciseId);
  if (!exercise) {
    await interaction.editReply({ content: 'Exercice non trouve.' });
    return;
  }

  if (exercise.status !== 'submitted' && exercise.status !== 'ai_reviewed') {
    await interaction.editReply({ content: `Exercice deja traite (${exercise.status}).` });
    return;
  }

  // Idempotency guard (D-03, D-08): if thread already exists, return link — do NOT create a duplicate
  if (exercise.review_thread_id) {
    const existing = await interaction.client.channels
      .fetch(exercise.review_thread_id)
      .catch(() => null);
    if (existing) {
      await interaction.editReply({ content: `📝 Thread de review existant : <#${existing.id}>` });
      return;
    }
    // Thread was deleted — fall through to create a new one
  }

  const student = await getStudent(exercise.student_id);
  if (!student) {
    await interaction.editReply({ content: 'Etudiant non trouve.' });
    return;
  }

  const session = exercise.session_id ? await getSession(exercise.session_id) : null;

  const adminChannel = interaction.guild?.channels.cache.find(
    (ch) => ch.name === CHANNELS.admin && ch instanceof TextChannel
  ) as TextChannel | undefined;

  if (!adminChannel) {
    await interaction.editReply({ content: 'Canal admin non trouve.' });
    return;
  }

  await createReviewThread(adminChannel, exercise, student, session, interaction.client);

  await interaction.editReply({ content: '📝 Thread de review cree.' });
}

// ============================================
// Approve or request revision from thread
// ============================================

async function handleReviewDecision(interaction: ButtonInteraction): Promise<void> {
  const isApprove = interaction.customId.startsWith('review_approve_');
  const exerciseId = interaction.customId.replace(
    isApprove ? 'review_approve_' : 'review_revision_',
    ''
  );
  const newStatus: ExerciseStatus = isApprove ? 'approved' : 'revision_needed';

  await interaction.deferReply({ ephemeral: true });

  // 1. Load exercise and verify status (race condition guard)
  const exercise = await getExercise(exerciseId);
  if (!exercise) {
    await interaction.editReply({ content: 'Exercice non trouve.' });
    return;
  }

  if (exercise.status !== 'submitted' && exercise.status !== 'ai_reviewed') {
    await interaction.editReply({ content: `Exercice deja traite (${exercise.status}). Impossible de valider.` });
    return;
  }

  // 2. Collect formateur's messages from the thread
  const thread = interaction.channel;
  if (!thread || !thread.isThread()) {
    await interaction.editReply({ content: 'Cette action doit etre utilisee dans un thread de review.' });
    return;
  }

  const messages = await thread.messages.fetch({ limit: 100 });
  const botId = interaction.client.user?.id;
  const formateurMessages = messages
    .filter((m) => m.author.id !== botId && !m.author.bot)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map((m) => m.content)
    .filter((content) => content.trim().length > 0);

  const feedback = formateurMessages.length > 0
    ? formateurMessages.map((msg) => `— ${msg}`).join('\n')
    : isApprove ? '— Отличная работа!' : '— Нужна доработка.';

  // 3. Update DB
  await updateExerciseStatus(exerciseId, newStatus, feedback);

  logger.info(
    { exerciseId, newStatus, feedbackLength: feedback.length, commentCount: formateurMessages.length },
    'Exercise review completed from thread'
  );

  // 4. Send DM to student
  const student = await getStudent(exercise.student_id);
  const session = exercise.session_id ? await getSession(exercise.session_id) : null;

  if (student?.discord_id) {
    try {
      const guild = interaction.guild;
      const member = await guild?.members.fetch(student.discord_id);
      if (member) {
        const dm = await member.createDM();
        const dmText = formatStudentFeedbackDM(exercise, session, feedback, newStatus);
        await dm.send(dmText);
        logger.info({ studentId: student.id, exerciseId }, 'Feedback DM sent to student');
      }
    } catch (dmError) {
      logger.warn({ error: dmError, studentId: student?.id }, 'Could not DM student for review feedback');
    }
  }

  // 5. Edit the original notification in #админ
  if (exercise.notification_message_id) {
    try {
      const adminChannel = interaction.guild?.channels.cache.find(
        (ch) => ch.name === CHANNELS.admin && ch instanceof TextChannel
      ) as TextChannel | undefined;

      if (adminChannel) {
        const notifMsg = await adminChannel.messages.fetch(exercise.notification_message_id);
        if (notifMsg) {
          // Reload exercise to get updated status
          const updatedExercise = await getExercise(exerciseId);
          if (updatedExercise && student) {
            const attachmentsWithUrls = await import('@assistme/core').then((m) => m.getSignedUrlsForExercise(exerciseId));
            const updatedEmbed = formatSubmissionNotification(
              updatedExercise,
              session,
              student.name,
              attachmentsWithUrls,
              updatedExercise.submission_count > 1
            );
            // Remove the button (exercise is processed)
            await notifMsg.edit({ embeds: [updatedEmbed], components: [] });
          }
        }
      }
    } catch (editError) {
      logger.warn({ error: editError, exerciseId }, 'Could not edit notification message');
    }
  }

  // 6. Confirm in thread and archive
  const statusLabel = isApprove ? '✅ Approuve' : '🔄 Revision demandee';
  await thread.send(`${statusLabel} — feedback envoye a l'etudiant.`);

  try {
    await (thread as ThreadChannel).setArchived(true);
  } catch (archiveError) {
    logger.warn({ error: archiveError }, 'Could not archive review thread');
  }

  await interaction.editReply({ content: `${statusLabel}. Thread archive.` });
}

// ============================================
// View exercises by session (from digest or /review global buttons)
// ============================================

async function handleReviewSession(interaction: ButtonInteraction): Promise<void> {
  const sessionNumber = parseInt(interaction.customId.replace('review_session_', ''), 10);
  if (isNaN(sessionNumber)) {
    await interaction.reply({ content: 'Session invalide.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

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

  const lines = pending.map((ex) => {
    const name = studentNames.get(ex.student_id) ?? 'Inconnu';
    const emoji = '📩';
    const resubLabel = ex.submission_count > 1 ? ` (#${ex.submission_count})` : '';
    return `${emoji} **${name}**${resubLabel}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`📋 Exercices — ${sessionTitle}`)
    .setDescription(`**En attente : ${pending.length}**\n\n${lines.join('\n')}`)
    .setColor(0x5865f2)
    .setTimestamp();

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
