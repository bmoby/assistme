import type { Client, Interaction, Message, ButtonInteraction } from 'discord.js';
import { logger } from '@assistme/core';
import { handleQuizStart } from './quiz-start.js';
import { handleQuizAnswer } from './quiz-answer.js';
import { handleQuizDm } from './quiz-dm.js';

const buttonHandlers = new Map<string, (i: ButtonInteraction) => Promise<void>>();

function registerButton(prefix: string, handler: (i: ButtonInteraction) => Promise<void>): void {
  buttonHandlers.set(prefix, handler);
}

export function setupHandlers(client: Client): void {
  registerButton('quiz_start_', handleQuizStart);
  registerButton('quiz_answer_', handleQuizAnswer);

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton()) return;

    for (const [prefix, handler] of buttonHandlers) {
      if (interaction.customId.startsWith(prefix)) {
        try {
          await handler(interaction);
        } catch (err) {
          logger.error({ err, customId: interaction.customId }, 'Quiz button handler error');
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
  });

  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (message.guild !== null) return; // DMs only
    await handleQuizDm(message);
  });

  logger.info('Quiz handlers registered');
}
