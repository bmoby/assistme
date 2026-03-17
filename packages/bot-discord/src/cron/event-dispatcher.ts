import { Client, TextChannel, AttachmentBuilder } from 'discord.js';
import { getUnprocessedEvents, markEventProcessed, agents } from '@assistme/core';
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

          case 'agent_job_completed': {
            const data = event.data as Record<string, unknown>;
            const targetChannelId = data.chat_id as string | undefined;
            const resultFiles = (data.result_files as Array<{ storage_path: string; filename: string; mime_type: string }>) ?? [];
            const resultText = data.result_text as string | null;

            // Send to the channel where the command was issued, or fallback to annonces
            let targetChannel: TextChannel | undefined;
            if (targetChannelId) {
              const ch = guild.channels.cache.get(targetChannelId);
              if (ch instanceof TextChannel) targetChannel = ch;
            }
            if (!targetChannel) {
              targetChannel = guild.channels.cache.find(
                (ch) => ch.name === CHANNELS.annonces && ch instanceof TextChannel
              ) as TextChannel | undefined;
            }

            if (targetChannel) {
              if (resultText) {
                await targetChannel.send(resultText);
              }

              for (const file of resultFiles) {
                try {
                  const buffer = await agents.downloadFromStorage(file.storage_path);
                  const attachment = new AttachmentBuilder(buffer, { name: file.filename });
                  await targetChannel.send({
                    content: `${data.agent_name ?? 'Agent'} — ${file.filename}`,
                    files: [attachment],
                  });
                } catch (err) {
                  logger.error({ err, storagePath: file.storage_path }, 'Failed to send agent file to Discord');
                }
              }
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
