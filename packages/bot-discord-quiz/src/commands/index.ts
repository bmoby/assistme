import { Client, REST, Routes, Collection, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '@assistme/core';
import { handleButtonInteraction } from '../handlers/index.js';
// This import also triggers registerButton calls at module level for quiz_confirm_ and quiz_cancel_
import { quizCreateCommand, handleQuizCreate } from './quiz-create.js';
import { quizStatusCommand, handleQuizStatus } from './quiz-status.js';
// This import also triggers registerButton calls at module level for quiz_close_confirm_ and quiz_close_cancel_
import { quizCloseCommand, handleQuizClose } from './quiz-close.js';

type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

// Command registry -- populated by command modules at import time
export const commands: Array<{ data: SlashCommandBuilder; handler: CommandHandler }> = [];

commands.push({ data: quizCreateCommand as SlashCommandBuilder, handler: handleQuizCreate });
commands.push({ data: quizStatusCommand as SlashCommandBuilder, handler: handleQuizStatus });
commands.push({ data: quizCloseCommand as SlashCommandBuilder, handler: handleQuizClose });

const commandHandlers = new Collection<string, CommandHandler>();

export function refreshHandlerMap(): void {
  commandHandlers.clear();
  for (const cmd of commands) {
    commandHandlers.set(cmd.data.name, cmd.handler);
  }
}

export async function registerSlashCommands(token: string, clientId: string, guildId: string): Promise<void> {
  refreshHandlerMap();

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    logger.info({ count: commands.length }, 'Registering quiz slash commands');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands.map((c) => c.data.toJSON()) }
    );
    logger.info('Quiz slash commands registered successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to register quiz slash commands');
    throw error;
  }
}

export function setupCommandHandler(client: Client): void {
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) return;

    try {
      await handler(interaction);
    } catch (error) {
      logger.error({ error, command: interaction.commandName }, 'Quiz command handler error');
      const reply = { content: 'Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });
}
