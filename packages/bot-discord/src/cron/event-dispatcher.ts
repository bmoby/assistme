import { Client, TextChannel } from 'discord.js';
import { getUnprocessedEvents, markEventProcessed } from '@assistme/core';
import { logger } from '@assistme/core';
import { CHANNELS } from '../config.js';

export async function dispatchDiscordEvents(client: Client, guildId: string): Promise<void> {
  try {
    const events = await getUnprocessedEvents('discord');

    if (events.length === 0) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn({ guildId }, 'Guild not found for event dispatch');
      return;
    }

    for (const event of events) {
      try {
        switch (event.type) {
          case 'announcement': {
            const announcesChannel = guild.channels.cache.find(
              (ch) => ch.name === CHANNELS.annonces && ch instanceof TextChannel
            ) as TextChannel | undefined;

            if (announcesChannel) {
              const text = (event.data as Record<string, string>).text ?? '';
              await announcesChannel.send(`📢 **Объявление**\n\n${text}`);
            }
            break;
          }

          default:
            logger.info({ type: event.type }, 'Unknown event type for Discord dispatch');
        }

        await markEventProcessed(event.id);
      } catch (err) {
        logger.error({ err, eventId: event.id, type: event.type }, 'Failed to dispatch Discord event');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Discord event dispatcher failed');
  }
}
