import { ButtonInteraction, TextChannel } from 'discord.js';
import {
  logger,
  getExercise,
  getSession,
  getStudent,
} from '@assistme/core';
import { registerButton } from './button-handler.js';
import { createReviewThread } from '../utils/review-thread.js';
import { CHANNELS } from '../config.js';

/**
 * Register all review-related button handlers.
 */
export function registerReviewButtons(): void {
  registerButton('review_open_', handleReviewOpen);
}

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

  await createReviewThread(adminChannel, exercise, student, session);

  await interaction.editReply({ content: '📝 Thread de review cree.' });
}
