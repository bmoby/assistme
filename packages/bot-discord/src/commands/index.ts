import { Client, REST, Routes, Collection, ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '@assistme/core';

// Admin commands
import { addStudentCommand, handleAddStudent } from './admin/add-student.js';
import { announceCommand, handleAnnounce } from './admin/announce.js';
import { reviewCommand, handleReview } from './admin/review.js';
import { approveCommand, handleApprove } from './admin/approve.js';
import { revisionCommand, handleRevision } from './admin/revision.js';
import { studentListCommand, handleStudentList } from './admin/student-list.js';
import { sessionCommand, handleSession } from './admin/session.js';
import { sessionUpdateCommand, handleSessionUpdate } from './admin/session-update.js';

type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

// Set admin-only visibility on all commands (only users with ManageGuild see them)
const adminCommands = [
  addStudentCommand,
  announceCommand,
  approveCommand,
  revisionCommand,
  studentListCommand,
  sessionCommand,
  sessionUpdateCommand,
];
for (const cmd of adminCommands) {
  cmd.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
}

// Review is visible to admins + mentors (ManageRoles = mentor-level)
reviewCommand.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

const commands: Array<{ data: SlashCommandBuilder; handler: CommandHandler }> = [
  { data: addStudentCommand as SlashCommandBuilder, handler: handleAddStudent },
  { data: announceCommand as SlashCommandBuilder, handler: handleAnnounce },
  { data: reviewCommand as SlashCommandBuilder, handler: handleReview },
  { data: approveCommand as SlashCommandBuilder, handler: handleApprove },
  { data: revisionCommand as SlashCommandBuilder, handler: handleRevision },
  { data: studentListCommand as SlashCommandBuilder, handler: handleStudentList },
  { data: sessionCommand as SlashCommandBuilder, handler: handleSession },
  { data: sessionUpdateCommand as SlashCommandBuilder, handler: handleSessionUpdate },
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

      const reply = { content: 'Произошла ошибка.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });
}
