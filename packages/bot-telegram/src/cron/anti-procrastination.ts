import type { Bot } from 'grammy';
import { getNextTask, getTasksByStatus, logger } from '@vibe-coder/core';

export async function antiProcrastination(bot: Bot, chatId: string): Promise<void> {
  try {
    // Check if any task was started or completed today
    const inProgress = await getTasksByStatus('in_progress');
    const done = await getTasksByStatus('done');

    const today = new Date().toISOString().split('T')[0]!;
    const doneToday = done.filter(
      (t) => t.completed_at && t.completed_at.startsWith(today)
    );

    // If something is in progress or done today, no need to nag
    if (inProgress.length > 0 || doneToday.length > 0) {
      return;
    }

    // Nothing started yet - send motivation
    const nextTask = await getNextTask();
    if (!nextTask) return;

    const time = nextTask.estimated_minutes
      ? `\nTemps estime : ${nextTask.estimated_minutes} min`
      : '';

    let message = `⚠️ Il est 11h. Ta fenetre d'or a commence.\n\n`;
    message += `Aucune tache demarree aujourd'hui.\n\n`;
    message += `Ta tache #1 : ${nextTask.title}${time}\n\n`;
    message += `Juste celle-la. Rien d'autre.\n\n`;
    message += `/done quand c'est fait.`;

    await bot.api.sendMessage(chatId, message);
    logger.info('Anti-procrastination reminder sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send anti-procrastination reminder');
  }
}
