import { Client } from 'discord.js';
import { scheduler, logger, agents } from '@assistme/core';
import { sendExerciseDigest } from './exercise-digest.js';
import { detectDropouts } from './dropout-detector.js';
import { dispatchDiscordEvents } from './event-dispatcher.js';
import { sendDeadlineReminders } from './deadline-reminders.js';
import { cleanupOrphanedFiles } from './storage-cleanup.js';

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

  // Deadline reminders — 48h before, daily at 10:00
  scheduler.registerJob('formation-deadline-48h', '0 10 * * *', async () => {
    await sendDeadlineReminders(client, 48);
  });

  // Deadline reminders — 24h before, daily at 10:00
  scheduler.registerJob('formation-deadline-24h', '0 10 * * *', async () => {
    await sendDeadlineReminders(client, 24);
  });

  // Clean up orphaned files in Supabase Storage — daily at 03:00
  scheduler.registerJob('formation-storage-cleanup', '0 3 * * *', async () => {
    await cleanupOrphanedFiles();
  });

  // Agent job processor — every minute
  scheduler.registerJob('agent-job-processor', '*/1 * * * *', async () => {
    await agents.processAgentJobs();
  });

  scheduler.startAllJobs();
  logger.info('Discord formation cron jobs started');
}
