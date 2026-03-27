import { Client } from 'discord.js';
import { scheduler, logger } from '@assistme/core';
import { closeExpiredQuizzes } from './close-expired-quizzes.js';

export function registerCronJobs(client: Client, guildId: string): void {
  // Close expired quiz sessions every 30 minutes (D-01: 48h expiration threshold)
  scheduler.registerJob('quiz-close-expired', '*/30 * * * *', async () => {
    await closeExpiredQuizzes();
  });

  scheduler.startAllJobs();
  logger.info('TeacherBot cron jobs started');
}
