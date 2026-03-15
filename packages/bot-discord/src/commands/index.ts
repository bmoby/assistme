import { Client, REST, Routes, Collection, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '@vibe-coder/core';

// Student commands
import { submitCommand, handleSubmit } from './student/submit.js';
import { progressCommand, handleProgress } from './student/progress.js';

// Admin commands
import { addStudentCommand, handleAddStudent } from './admin/add-student.js';
import { announceCommand, handleAnnounce } from './admin/announce.js';
import { resourceCommand, handleResource } from './admin/resource.js';
import { liveCommand, handleLive } from './admin/live.js';
import { deadlineCommand, handleDeadline } from './admin/deadline.js';
import { reviewCommand, handleReview } from './admin/review.js';
import { approveCommand, handleApprove } from './admin/approve.js';
import { revisionCommand, handleRevision } from './admin/revision.js';
import { studentListCommand, handleStudentList } from './admin/student-list.js';

type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

const commands: Array<{ data: SlashCommandBuilder; handler: CommandHandler }> = [
  // Student
  { data: submitCommand as SlashCommandBuilder, handler: handleSubmit },
  { data: progressCommand as SlashCommandBuilder, handler: handleProgress },
  // Admin
  { data: addStudentCommand as SlashCommandBuilder, handler: handleAddStudent },
  { data: announceCommand as SlashCommandBuilder, handler: handleAnnounce },
  { data: resourceCommand as SlashCommandBuilder, handler: handleResource },
  { data: liveCommand as SlashCommandBuilder, handler: handleLive },
  { data: deadlineCommand as SlashCommandBuilder, handler: handleDeadline },
  { data: reviewCommand as SlashCommandBuilder, handler: handleReview },
  { data: approveCommand as SlashCommandBuilder, handler: handleApprove },
  { data: revisionCommand as SlashCommandBuilder, handler: handleRevision },
  { data: studentListCommand as SlashCommandBuilder, handler: handleStudentList },
];

const commandHandlers = new Collection<string, CommandHandler>();
for (const cmd of commands) {
  commandHandlers.set(cmd.data.name, cmd.handler);
}

export async function registerSlashCommands(token: string, clientId: string, guildId: string): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info({ count: commands.length }, 'Registering slash commands');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands.map((c) => c.data.toJSON()) }
    );

    logger.info('Slash commands registered successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to register slash commands');
    throw error;
  }
}

export function setupCommandHandler(client: Client): void {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) return;

    try {
      await handler(interaction);
    } catch (error) {
      logger.error({ error, command: interaction.commandName }, 'Command handler error');

      const reply = { content: 'Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });
}
