import type { Bot } from 'grammy';
import {
  planDailyNotifications,
  getNotificationCount,
  createReminders,
  getDueReminders,
  markReminderSent,
  cancelActiveReminders,
  getTodayReminders,
  logger,
} from '@assistme/core';

/**
 * Plan all notifications for the day.
 * Called daily at 7:00 by cron, or manually via /replan.
 */
export async function planDay(): Promise<number> {
  try {
    // Cancel any remaining active notifications for today (in case of replan)
    const cancelled = await cancelActiveReminders();
    if (cancelled > 0) {
      logger.info({ cancelled }, 'Cancelled stale notifications before replanning');
    }

    // Get user's preferred notification count
    const count = await getNotificationCount();

    // Ask AI to plan the day's notifications
    const planned = await planDailyNotifications(count);

    if (planned.length === 0) {
      logger.warn('Notification planner returned 0 notifications');
      return 0;
    }

    // Convert HH:MM to full ISO timestamps
    const today = new Date().toISOString().split('T')[0]!;
    const now = new Date();

    const reminders = planned
      .map((notif) => {
        const triggerDate = new Date(`${today}T${notif.time}:00`);
        return {
          message: notif.message,
          trigger_at: triggerDate.toISOString(),
          repeat: 'once' as const,
          repeat_config: { type: notif.type, planned_by: 'notification-planner' },
          channel: 'telegram' as const,
        };
      })
      // Filter out notifications in the past (in case of late planning or replan)
      .filter((r) => new Date(r.trigger_at) > now);

    if (reminders.length === 0) {
      logger.warn('All planned notifications are in the past');
      return 0;
    }

    // Batch insert all notifications
    await createReminders(reminders);

    logger.info({ stored: reminders.length, total: planned.length }, 'Daily notifications stored in DB');
    return reminders.length;
  } catch (error) {
    logger.error({ error }, 'Failed to plan daily notifications');
    return 0;
  }
}

/**
 * Check for due notifications and send them.
 * Called every 2 minutes by cron.
 */
export async function dispatchNotifications(bot: Bot, chatId: string): Promise<void> {
  try {
    const dueReminders = await getDueReminders();

    if (dueReminders.length === 0) return;

    logger.info({ count: dueReminders.length }, 'Dispatching due notifications');

    for (const reminder of dueReminders) {
      try {
        await bot.api.sendMessage(chatId, reminder.message);
        await markReminderSent(reminder.id);

        const config = reminder.repeat_config as Record<string, unknown> | null;
        logger.info(
          { id: reminder.id, type: config?.['type'] ?? 'unknown' },
          'Notification sent'
        );
      } catch (error) {
        logger.error({ error, reminderId: reminder.id }, 'Failed to send notification');
        // Mark as sent to avoid infinite retry loop
        await markReminderSent(reminder.id);
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to dispatch notifications');
  }
}

/**
 * Get a summary of today's notification plan for the /notifs command.
 */
export async function getNotificationsSummary(): Promise<string> {
  const count = await getNotificationCount();
  const reminders = await getTodayReminders();

  const active = reminders.filter((r) => r.status === 'active');
  const sent = reminders.filter((r) => r.status === 'sent');

  let summary = `Notifications aujourd'hui : ${count}/jour\n\n`;
  summary += `Envoyees : ${sent.length}\n`;
  summary += `En attente : ${active.length}\n`;

  if (active.length > 0) {
    summary += `\nProchaines :\n`;
    for (const r of active.slice(0, 5)) {
      const time = new Date(r.trigger_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const config = r.repeat_config as Record<string, unknown> | null;
      const type = config?.['type'] ?? '';
      summary += `  ${time} [${type}] ${r.message.slice(0, 60)}${r.message.length > 60 ? '...' : ''}\n`;
    }
    if (active.length > 5) {
      summary += `  ... et ${active.length - 5} autres\n`;
    }
  }

  return summary;
}
