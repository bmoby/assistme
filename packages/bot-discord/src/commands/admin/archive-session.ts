import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import {
  archiveExercisesBySession,
  getPendingExercisesBySession,
  getSessionByNumber,
  getAllSessions,
  logger,
} from '@assistme/core';
import { isAdmin } from '../../utils/auth.js';

export const archiveSessionCommand = new SlashCommandBuilder()
  .setName('archive-session')
  .setDescription("[Admin] Archiver tous les exercices d'une session")
  .addIntegerOption((opt) =>
    opt
      .setName('session')
      .setDescription('Numero de la session')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function handleArchiveSessionAutocomplete(
  interaction: AutocompleteInteraction
): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const choices: Array<{ name: string; value: number }> = [];

    for (const session of sessions) {
      const pending = await getPendingExercisesBySession(session.session_number);
      if (pending.length > 0) {
        choices.push({
          name: `Session ${session.session_number} — ${session.title} (${pending.length} exercice(s))`,
          value: session.session_number,
        });
      }
    }

    await interaction.respond(choices.slice(0, 25));
  } catch (error) {
    logger.error({ error }, 'Failed to autocomplete archive-session');
    await interaction.respond([]);
  }
}

export async function handleArchiveSession(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: 'Commande reservee aux administrateurs.',
      ephemeral: true,
    });
    return;
  }

  const sessionNumber = interaction.options.getInteger('session', true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const session = await getSessionByNumber(sessionNumber);
    if (!session) {
      await interaction.editReply({
        content: `Session ${sessionNumber} non trouvee.`,
      });
      return;
    }

    const pending = await getPendingExercisesBySession(sessionNumber);
    if (pending.length === 0) {
      await interaction.editReply({
        content: `Aucun exercice a archiver pour la session ${sessionNumber}.`,
      });
      return;
    }

    const confirmId = `archive_confirm_${sessionNumber}`;
    const cancelId = `archive_cancel_${sessionNumber}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('Archiver')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    const reply = await interaction.editReply({
      content: `Archiver ${pending.length} exercice(s) de la session ${sessionNumber} ?`,
      components: [row],
    });

    try {
      const buttonInteraction = await reply.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
      });

      if (buttonInteraction.customId === confirmId) {
        const result = await archiveExercisesBySession(sessionNumber);

        await buttonInteraction.update({
          content: `${result.archived} exercice(s) archive(s) pour la session ${sessionNumber}.`,
          components: [],
        });

        logger.info(
          { sessionNumber, archived: result.archived },
          'Session exercises archived'
        );
      } else {
        await buttonInteraction.update({
          content: 'Archivage annule.',
          components: [],
        });
      }
    } catch {
      await interaction.editReply({
        content: 'Delai expire — archivage annule.',
        components: [],
      });
    }
  } catch (error) {
    logger.error({ error, sessionNumber }, 'Failed to archive session');
    await interaction.editReply({
      content: "Erreur lors de l'archivage.",
    });
  }
}
