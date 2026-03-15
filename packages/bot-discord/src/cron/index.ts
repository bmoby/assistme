import { Client } from 'discord.js';
import { scheduler, logger } from '@vibe-coder/core';
import { sendExerciseDigest } from './exercise-digest.js';
import { detectDropouts } from './dropout-detector.js';
import { dispatchDiscordEvents } from './event-dispatcher.js';

export function registerCronJobs(client: Client, guildId: string): void {
  // Daily exercise digest at 20:00
  scheduler.registerJob('formation-exercise-digest', '0 20 * * *', async () => {
    await sendExerciseDigest();
    logger.info('Exercise digest sent');
  });

  // Weekly dropout detection — Monday at 10:00
  scheduler.registerJob('formation-dropout-detector', '0 10 * * 1', async () => {
    await detectDropouts();
    logger.info('Dropout detection completed');
  });

  // Process events from Telegram admin — every 5 minutes
  scheduler.registerJob('formation-event-dispatcher', '*/5 * * * *', async () => {
    await dispatchDiscordEvents(client, guildId);
  });

  scheduler.startAllJobs();
  logger.info('Discord formation cron jobs started');
}
