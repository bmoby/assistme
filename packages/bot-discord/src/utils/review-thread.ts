import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ThreadAutoArchiveDuration,
} from 'discord.js';
import {
  logger,
  getExercise,
  getSession,
  getSignedUrlsForExercise,
} from '@assistme/core';
import type { StudentExercise, Session, Student } from '@assistme/core';
import { formatReviewThreadMessages } from './format.js';

/**
 * Creates a review thread in #админ with full submission content.
 */
export async function createReviewThread(
  adminChannel: TextChannel,
  exercise: StudentExercise,
  student: Student,
  session: Session | null,
): Promise<void> {
  const sessionLabel = session
    ? `Session ${session.session_number}`
    : `S${exercise.exercise_number}`;
  const countLabel = exercise.submission_count > 1 ? ` (#${exercise.submission_count})` : '';
  const threadName = `Review: ${student.name} — ${sessionLabel}${countLabel}`;

  // Get attachments with signed URLs
  const attachmentsWithUrls = await getSignedUrlsForExercise(exercise.id);

  // Build formatted messages
  const { submissionMsg, aiReviewMsg, historyMsg, imageUrl } = formatReviewThreadMessages(
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

  // Message 2: AI review (if available)
  if (aiReviewMsg) {
    await thread.send(aiReviewMsg);
  } else {
    await thread.send('🤖 **Review IA :** en cours...');
  }

  // Message 3: History (if re-submission)
  if (historyMsg) {
    await thread.send(historyMsg);
  }

  // Message 4: Action buttons
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

  logger.info(
    { threadId: thread.id, exerciseId: exercise.id, studentName: student.name },
    'Review thread created',
  );
}
