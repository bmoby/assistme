import type { Bot } from 'grammy';
import {
  getActiveTasks,
  getOverdueTasks,
  saveDailyPlan,
  generateDailyPlan,
  logger,
} from '@vibe-coder/core';
import { formatDailyPlan, todayDateString, getDayOfWeek } from '../utils/format.js';

export async function morningPlan(bot: Bot, chatId: string): Promise<void> {
  try {
    const activeTasks = await getActiveTasks();
    const overdueTasks = await getOverdueTasks();

    if (activeTasks.length === 0 && overdueTasks.length === 0) {
      await bot.api.sendMessage(
        chatId,
        '☀️ Bonjour ! Aucune tache en attente.\n\nEnvoie /add pour ajouter des taches.'
      );
      return;
    }

    const planTasks = await generateDailyPlan({
      activeTasks,
      overdueTasks,
      dayOfWeek: getDayOfWeek(),
      sportDoneRecently: false, // TODO: check habits table
    });

    await saveDailyPlan({
      date: todayDateString(),
      plan: planTasks,
      status: 'active',
      review: null,
      productivity_score: null,
    });

    const dayName = getDayOfWeek();
    const dateFormatted = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });

    let message = `☀️ Bonjour ! Voici ta journee (${dayName} ${dateFormatted})\n\n`;
    message += formatDailyPlan(planTasks);
    message += `⏱️ Fenetre d'or : 10h-15h. Protege-la.\n\n`;
    message += `💪 Si tu ne fais que les rouges aujourd'hui, c'est deja une victoire.`;

    await bot.api.sendMessage(chatId, message);

    logger.info('Morning plan sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send morning plan');
  }
}
