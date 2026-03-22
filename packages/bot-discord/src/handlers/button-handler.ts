import { ButtonInteraction } from 'discord.js';
import { logger } from '@assistme/core';

type ButtonHandler = (interaction: ButtonInteraction) => Promise<void>;

const handlers = new Map<string, ButtonHandler>();

/**
 * Register a button handler for a given custom ID prefix.
 * Example: registerButton('review_open_', handler) will match 'review_open_abc123'
 */
export function registerButton(prefix: string, handler: ButtonHandler): void {
  handlers.set(prefix, handler);
}

/**
 * Dispatch a button interaction to the matching handler by prefix.
 */
export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;

  for (const [prefix, handler] of handlers) {
    if (customId.startsWith(prefix)) {
      try {
        await handler(interaction);
      } catch (error) {
        logger.error({ error, customId }, 'Button handler error');
        const reply = { content: 'Произошла ошибка.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }
  }

  logger.warn({ customId }, 'Unknown button interaction');
}
