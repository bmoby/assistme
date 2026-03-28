import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { logger, getQuizBySession, getSessionsByQuiz, updateQuizStatus, updateQuizSession } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';
import { registerButton } from '../handlers/index.js';

// ============================================
// Slash command definition
// ============================================

export const quizCloseCommand = new SlashCommandBuilder()
  .setName('quiz-close')
  .setDescription('Fermer un quiz et expirer les sessions en cours')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption((opt) =>
    opt.setName('session').setDescription('Numero de session').setRequired(true)
  );

// ============================================
// Constants
// ============================================

const DESTRUCTIVE_RED = 0xED4245;

// ============================================
// Helper: build disabled button row
// ============================================

function buildDisabledRow(sessionNumber: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz_close_confirm_${sessionNumber}`)
      .setLabel('Confirmer la fermeture')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`quiz_close_cancel_${sessionNumber}`)
      .setLabel('Annuler la fermeture')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true),
  );
}

// ============================================
// Main handler
// ============================================

export async function handleQuizClose(interaction: ChatInputCommandInteraction): Promise<void> {
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

  // Step 2: Check if already closed
  if (quiz.status === 'closed') {
    await interaction.editReply(`Le quiz Session ${sessionNumber} est deja ferme.`);
    return;
  }

  // Step 3: Get sessions for impact assessment
  const quizSessions = await getSessionsByQuiz(quiz.id);
  const inProgressCount = quizSessions.filter((s) => s.status === 'in_progress').length;
  const notStartedCount = quizSessions.filter((s) => s.status === 'not_started').length;

  // Step 4: Build confirmation embed
  const embed = new EmbedBuilder()
    .setTitle(`Fermer le quiz \u2014 Session ${sessionNumber}`)
    .setColor(DESTRUCTIVE_RED)
    .setDescription(
      `${inProgressCount} session(s) en cours seront marquees expired_incomplete. ${notStartedCount} etudiant(s) n'ont pas commence. Cette action est irreversible.`,
    );

  // Step 5: Buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz_close_confirm_${sessionNumber}`)
      .setLabel('Confirmer la fermeture')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`quiz_close_cancel_${sessionNumber}`)
      .setLabel('Annuler la fermeture')
      .setStyle(ButtonStyle.Danger),
  );

  // Step 6: Reply with confirmation
  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ============================================
// Button handler: Confirm close
// ============================================

async function handleQuizCloseConfirm(interaction: ButtonInteraction): Promise<void> {
  // Extract sessionNumber from customId: quiz_close_confirm_{sessionNumber}
  const sessionNumber = parseInt(interaction.customId.replace('quiz_close_confirm_', ''), 10);

  // Disable both buttons immediately
  const disabledRow = buildDisabledRow(sessionNumber);
  await interaction.update({ components: [disabledRow] });

  // Re-fetch quiz (guard against race condition)
  const quiz = await getQuizBySession(sessionNumber);
  if (!quiz) {
    await interaction.editReply({
      content: `Aucun quiz actif pour la session ${sessionNumber}.`,
      embeds: [],
      components: [],
    });
    return;
  }

  if (quiz.status === 'closed') {
    await interaction.editReply({
      content: `Le quiz Session ${sessionNumber} est deja ferme.`,
      embeds: [],
      components: [],
    });
    return;
  }

  try {
    // Close the quiz
    await updateQuizStatus(quiz.id, 'closed');

    // Expire all in-progress and not-started sessions
    const quizSessions = await getSessionsByQuiz(quiz.id);
    let expiredCount = 0;

    for (const session of quizSessions) {
      if (session.status === 'in_progress' || session.status === 'not_started') {
        await updateQuizSession(session.id, {
          status: 'expired_incomplete',
          completed_at: new Date().toISOString(),
        });
        expiredCount++;
      }
    }

    // Success message
    await interaction.editReply({
      content: `Quiz Session ${sessionNumber} ferme. ${expiredCount} sessions expirees.`,
      embeds: [],
      components: [],
    });

    logger.info(
      { quizId: quiz.id, sessionNumber, expiredCount },
      'Quiz closed manually via /quiz-close',
    );
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Failed to close quiz');
    await interaction.editReply({
      content: 'Erreur lors de la fermeture du quiz.',
      embeds: [],
      components: [],
    });
  }
}

// ============================================
// Button handler: Cancel close
// ============================================

async function handleQuizCloseCancel(interaction: ButtonInteraction): Promise<void> {
  // Extract sessionNumber from customId: quiz_close_cancel_{sessionNumber}
  const sessionNumber = parseInt(interaction.customId.replace('quiz_close_cancel_', ''), 10);

  // Disable both buttons
  const disabledRow = buildDisabledRow(sessionNumber);
  await interaction.update({
    content: 'Fermeture annulee.',
    embeds: [],
    components: [disabledRow],
  });
}

// ============================================
// Register button handlers at module level
// ============================================

registerButton('quiz_close_confirm_', handleQuizCloseConfirm);
registerButton('quiz_close_cancel_', handleQuizCloseCancel);
