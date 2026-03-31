import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ThreadAutoArchiveDuration,
} from 'discord.js';
import {
  logger,
  getSignedUrlsForExercise,
  updateExercise,
} from '@assistme/core';
import type { StudentExercise, Session, Student } from '@assistme/core';
import { formatReviewThreadMessages } from './format.js';

/**
 * Creates (or reuses) a review thread in #админ with full submission content.
 * Owns ALL DB persistence for review_thread_id.
 * Returns { threadId, aiMessageId: null } in both new-thread and reuse paths.
 */
export async function createReviewThread(
  adminChannel: TextChannel,
  exercise: StudentExercise,
  student: Student,
  session: Session | null,
  client: Client,
): Promise<{ threadId: string; aiMessageId: string | null }> {
  // ── THREAD REUSE PATH (D-01, D-02, D-04, D-05) ──────────────────────────
  if (exercise.review_thread_id) {
    const existing = await client.channels
      .fetch(exercise.review_thread_id)
      .catch(() => null);

    if (existing?.isThread()) {
      // Try to unarchive the thread — if it fails, fall through to new thread creation
      let unarchiveSucceeded = false;
      try {
        await existing.setArchived(false);
        unarchiveSucceeded = true;
      } catch (unarchiveErr) {
        logger.warn(
          { err: unarchiveErr, threadId: exercise.review_thread_id, exerciseId: exercise.id },
          'Could not unarchive existing thread — creating new thread instead',
        );
      }

      if (unarchiveSucceeded) {
        // Only continue the reuse path if we successfully unarchived
        const attachmentsWithUrls = await getSignedUrlsForExercise(exercise.id);
        const { submissionMsg, imageUrl } = formatReviewThreadMessages(
          exercise,
          session,
          student.name,
          attachmentsWithUrls,
        );

        // Separator
        const now = new Date().toLocaleString('fr-FR', { timeZone: 'Asia/Bangkok' });
        await existing.send(`--- Re-soumission #${exercise.submission_count} --- ${now} ---`);

        // New submission content
        if (imageUrl) {
          const imageEmbed = new EmbedBuilder().setImage(imageUrl);
          await existing.send({ content: submissionMsg, embeds: [imageEmbed] });
        } else {
          await existing.send(submissionMsg);
        }

        logger.info(
          { threadId: existing.id, exerciseId: exercise.id },
          'Review thread reused for re-submission',
        );

        return { threadId: existing.id, aiMessageId: null };
      }
      // setArchived failed — fall through to new thread creation below
    }
    // Thread was deleted or unarchive failed (D-02) — fall through to create a new one
  }

  // ── NEW THREAD PATH ──────────────────────────────────────────────────────
  const sessionLabel = session
    ? `Session ${session.session_number}`
    : `S${exercise.exercise_number}`;
  const countLabel = exercise.submission_count > 1 ? ` (#${exercise.submission_count})` : '';
  const threadName = `Review: ${student.name} — ${sessionLabel}${countLabel}`;

  // Get attachments with signed URLs
  const attachmentsWithUrls = await getSignedUrlsForExercise(exercise.id);

  // Build formatted messages
  const { submissionMsg, historyMsg, imageUrl } = formatReviewThreadMessages(
    exercise,
    session,
    student.name,
    attachmentsWithUrls,
  );

  // Create thread
  const thread = await adminChannel.threads.create({
    name: threadName.slice(0, 100), // Discord limit
    autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
  });

  // Message 1: Submission content
  if (imageUrl) {
    const imageEmbed = new EmbedBuilder().setImage(imageUrl);
    await thread.send({ content: submissionMsg, embeds: [imageEmbed] });
  } else {
    await thread.send(submissionMsg);
  }

  // Message 2: History (if re-submission)
  if (historyMsg) {
    await thread.send(historyMsg);
  }

  // Message 3: Action buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_approve_${exercise.id}`)
      .setLabel('Approuver')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`review_revision_${exercise.id}`)
      .setLabel('Demander revision')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔄'),
  );

  await thread.send({
    content: 'Ecris tes commentaires en russe ci-dessous.\nQuand tu as fini :',
    components: [row],
  });

  // Persist thread ID (single ownership — no caller should call updateExercise for this)
  await updateExercise(exercise.id, {
    review_thread_id: thread.id,
  });

  logger.info(
    { threadId: thread.id, exerciseId: exercise.id, studentName: student.name },
    'Review thread created',
  );

  return { threadId: thread.id, aiMessageId: null };
}
