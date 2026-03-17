import type { Bot } from 'grammy';
import { scheduler, logger, expireZombieReminders, runMemoryConsolidation } from '@vibe-coder/core';
import { planDay, dispatchNotifications } from './dynamic-notifications.js';
import { processFormationEvents } from './formation-events.js';

export function registerCronJobs(bot: Bot): void {
  const chatId = process.env['TELEGRAM_ADMIN_CHAT_ID'];
  if (!chatId) {
    logger.warn('TELEGRAM_ADMIN_CHAT_ID not set, skipping cron jobs');
    return;
  }

  // Memory consolidation — 03:00 every day (quiet hour)
  // Reviews expired working memories and decides: archive, delete, or renew
  scheduler.registerJob('memory-consolidation', '0 3 * * *', async () => {
    const result = await runMemoryConsolidation();
    logger.info(result, 'Memory consolidation completed');
  });

  // Zombie reminder cleanup — 06:55 every day (before daily plan at 07:00)
  // Cancels stale active reminders older than 24h
  scheduler.registerJob('zombie-reminder-cleanup', '55 6 * * *', async () => {
    const count = await expireZombieReminders();
    logger.info({ expired: count }, 'Zombie reminder cleanup completed');
  });

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

  // Formation events — every 5 minutes
  // Processes events from Discord bot (exercise submissions, alerts, digests)
  scheduler.registerJob('formation-events', '*/5 * * * *', () =>
    processFormationEvents(bot, chatId)
  );

  // Start all jobs
  scheduler.startAllJobs();
  logger.info('Cron system started (consolidation: 03:00, zombies: 06:55, plan: 07:00, dispatch: every 2min, formation: every 5min)');
}
