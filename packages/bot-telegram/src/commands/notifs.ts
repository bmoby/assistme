import type { Bot, Context } from 'grammy';
import { upsertMemory, logger } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';
import { planDay, getNotificationsSummary } from '../cron/dynamic-notifications.js';

export function registerNotifsCommand(bot: Bot): void {
  // /notifs — Show notification status or change count
  bot.command('notifs', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    const arg = ctx.match?.toString().trim();

    // /notifs (no arg) → show summary
    if (!arg) {
      try {
        const summary = await getNotificationsSummary();
        await ctx.reply(summary);
      } catch (error) {
        logger.error({ error }, 'Failed to get notifications summary');
        await ctx.reply('Erreur lors de la lecture des notifications.');
      }
      return;
    }

    // /notifs [number] → change count and replan
    const newCount = parseInt(arg, 10);
    if (isNaN(newCount) || newCount < 1 || newCount > 50) {
      await ctx.reply('Usage : /notifs [1-50]\nExemple : /notifs 20');
      return;
    }

    try {
      // Store in memory
      await upsertMemory({
        category: 'preference',
        key: 'notifications_par_jour',
        content: `${newCount} notifications par jour`,
        source: 'commande_notifs',
      });

      await ctx.reply(`Nombre de notifications : ${newCount}/jour\n\nReplanification en cours...`);

      // Replan for today with new count
      const planned = await planDay();

      await ctx.reply(`${planned} notifications planifiees pour le reste de la journee.`);
    } catch (error) {
      logger.error({ error }, 'Failed to update notification count');
      await ctx.reply('Erreur lors de la mise a jour. Reessaie.');
    }
  });

  // /replan — Force replan notifications
  bot.command('replan', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    try {
      await ctx.reply('Replanification en cours...');
      const planned = await planDay();
      await ctx.reply(`${planned} notifications replanifiees pour le reste de la journee.`);
    } catch (error) {
      logger.error({ error }, 'Failed to replan notifications');
      await ctx.reply('Erreur lors de la replanification.');
    }
  });
}
