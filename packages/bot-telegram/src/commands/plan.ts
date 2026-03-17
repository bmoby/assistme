import type { Bot, Context } from 'grammy';
import {
  getActiveTasks,
  getOverdueTasks,
  getDailyPlan,
  saveDailyPlan,
  generateDailyPlan,
} from '@assistme/core';
import { formatDailyPlan, todayDateString, getDayOfWeek } from '../utils/format.js';
import { isAdmin } from '../utils/auth.js';

export function registerPlanCommand(bot: Bot): void {
  bot.command('plan', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    const today = todayDateString();

    // Check if plan already exists for today
    let plan = await getDailyPlan(today);

    if (!plan) {
      // Generate a new plan
      await ctx.reply('Generation du plan en cours...');

      const activeTasks = await getActiveTasks();
      const overdueTasks = await getOverdueTasks();

      const planTasks = await generateDailyPlan({
        activeTasks,
        overdueTasks,
        dayOfWeek: getDayOfWeek(),
        sportDoneRecently: false, // TODO: check habits
      });

      plan = await saveDailyPlan({
        date: today,
        plan: planTasks,
        status: 'active',
        review: null,
        productivity_score: null,
      });
    }

    const dayName = getDayOfWeek();
    const dateFormatted = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });

    let message = `📋 Plan du ${dayName} ${dateFormatted}\n\n`;
    message += formatDailyPlan(plan.plan);
    message += '⏱️ Fenetre d\'or : 10h-15h. Protege-la.\n\n';
    message += '💪 Si tu ne fais que les rouges, c\'est deja bien.';

    await ctx.reply(message);
  });
}
