import type { Bot } from 'grammy';
import { scheduler, logger } from '@vibe-coder/core';
import { morningCheckIn, middayCheckIn, eveningReview } from './check-ins.js';
import { midnightReminder } from './midnight-reminder.js';
import { antiProcrastination } from './anti-procrastination.js';

export function registerCronJobs(bot: Bot): void {
  const chatId = process.env['TELEGRAM_ADMIN_CHAT_ID'];
  if (!chatId) {
    logger.warn('TELEGRAM_ADMIN_CHAT_ID not set, skipping cron jobs');
    return;
  }

  // Morning check-in - 08:30 every day
  // "Bonjour, des nouvelles ? Envoie un vocal."
  scheduler.registerJob('morning-checkin', '30 8 * * *', () => morningCheckIn(bot, chatId));

  // Anti-procrastination - 11:00 every day
  // If nothing done yet, push
  scheduler.registerJob('anti-procrastination', '0 11 * * *', () =>
    antiProcrastination(bot, chatId)
  );

  // Midday check-in - 14:00 every day
  // "Comment ca avance ? Du nouveau ?"
  scheduler.registerJob('midday-checkin', '0 14 * * *', () => middayCheckIn(bot, chatId));

  // Evening review - 19:00 every day
  // Bilan + "quelque chose pour demain ?"
  scheduler.registerJob('evening-review', '0 19 * * *', () => eveningReview(bot, chatId));

  // Midnight reminder - 00:00 every day
  // "Couche-toi, voila ce que tu perds si tu restes"
  scheduler.registerJob('midnight-reminder', '0 0 * * *', () => midnightReminder(bot, chatId));

  // Start all jobs
  scheduler.startAllJobs();
  logger.info('All cron jobs registered and started');
}
