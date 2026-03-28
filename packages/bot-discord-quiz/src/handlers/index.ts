import type { Client, Message, ButtonInteraction } from 'discord.js';
import { logger } from '@assistme/core';
import { handleQuizStart } from './quiz-start.js';
import { handleQuizAnswer } from './quiz-answer.js';
import { handleQuizDm } from './quiz-dm.js';

type ButtonHandler = (interaction: ButtonInteraction) => Promise<void>;

const handlers = new Map<string, ButtonHandler>();

export function registerButton(prefix: string, handler: ButtonHandler): void {
  handlers.set(prefix, handler);
}

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  for (const [prefix, handler] of handlers) {
    if (customId.startsWith(prefix)) {
      try {
        await handler(interaction);
      } catch (error) {
        logger.error({ error, customId }, 'Quiz button handler error');
        const reply = { content: 'Произошла ошибка. Попробуйте позже.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }
  }

  logger.warn({ customId }, 'Unknown quiz button interaction');
}

export function setupHandlers(client: Client): void {
  // Register Phase 10 quiz handlers
  registerButton('quiz_start_', handleQuizStart);
  registerButton('quiz_answer_', handleQuizAnswer);

  // DM listener for open answers + resume
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (message.guild !== null) return; // DMs only
    await handleQuizDm(message);
  });

  logger.info('Quiz handlers registered');
}
