import type { Bot } from 'grammy';
import { scheduler, logger } from '@vibe-coder/core';
import { planDay, dispatchNotifications } from './dynamic-notifications.js';

export function registerCronJobs(bot: Bot): void {
  const chatId = process.env['TELEGRAM_ADMIN_CHAT_ID'];
  if (!chatId) {
    logger.warn('TELEGRAM_ADMIN_CHAT_ID not set, skipping cron jobs');
    return;
  }

  // Daily planning — 07:00 every day
  // AI plans all notifications for the day based on context
  scheduler.registerJob('daily-notification-plan', '0 7 * * *', async () => {
    const count = await planDay();
    logger.info({ count }, 'Daily notification plan completed');
  });

  // Notification dispatcher — every 2 minutes
  // Checks for due notifications and sends them
  scheduler.registerJob('notification-dispatcher', '*/2 * * * *', () =>
    dispatchNotifications(bot, chatId)
  );

  // Start all jobs
  scheduler.startAllJobs();
  logger.info('Dynamic notification system started (plan: 07:00, dispatch: every 2min)');
}
