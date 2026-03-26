import { Client, TextChannel, AttachmentBuilder } from 'discord.js';
import { getUnprocessedEvents, markEventProcessed, agents, getExercise, getSession, getSignedUrlsForExercise } from '@assistme/core';
import { logger } from '@assistme/core';
import { CHANNELS } from '../config.js';
import { formatSubmissionNotification } from '../utils/format.js';

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

          case 'ai_review_complete': {
            const exerciseId = (event.data as Record<string, string>).exercise_id;
            if (!exerciseId) break;

            const exercise = await getExercise(exerciseId);
            if (!exercise || !exercise.notification_message_id) break;

            // Find the admin channel and the original notification message
            const adminCh = guild.channels.cache.find(
              (ch) => ch.name === CHANNELS.admin && ch instanceof TextChannel
            ) as TextChannel | undefined;

            if (!adminCh) break;

            try {
              const msg = await adminCh.messages.fetch(exercise.notification_message_id);
              if (!msg) break;

              // Rebuild the embed with AI score
              const session = exercise.session_id ? await getSession(exercise.session_id) : null;
              const attachmentsWithUrls = await getSignedUrlsForExercise(exerciseId);

              // Find student name from the existing embed
              const existingStudentField = msg.embeds[0]?.fields?.find((f) => f.name === '👤 Etudiant');
              const studentName = existingStudentField?.value ?? 'Etudiant';

              const isResubmission = exercise.submission_count > 1;
              const updatedEmbed = formatSubmissionNotification(exercise, session, studentName, attachmentsWithUrls, isResubmission);

              await msg.edit({ embeds: [updatedEmbed], components: msg.components });
              logger.info({ exerciseId, score: (exercise.ai_review as Record<string, unknown>)?.score }, 'Admin notification updated with AI score');
            } catch (editErr) {
              logger.warn({ error: editErr, exerciseId }, 'Failed to edit admin notification with AI score');
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
