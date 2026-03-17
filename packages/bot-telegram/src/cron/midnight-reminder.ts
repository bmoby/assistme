import type { Bot } from 'grammy';
import { getActiveTasks, logger } from '@assistme/core';

export async function midnightReminder(bot: Bot, chatId: string): Promise<void> {
  try {
    const tasks = await getActiveTasks();
    const urgentTomorrow = tasks
      .filter((t) => t.priority === 'urgent' || t.priority === 'important')
      .slice(0, 3);

    let message = `🌙 Il est minuit.\n\n`;
    message += `Si tu te couches maintenant :\n`;
    message += `  ✅ Reveil a 8h30 = 8h30 de sommeil\n`;
    message += `  ✅ Cafe + douche a 9h15\n`;
    message += `  ✅ Debut de travail a 10h = 5h de fenetre d'or\n\n`;
    message += `Si tu te couches a 2h :\n`;
    message += `  ❌ Reveil difficile a 10h\n`;
    message += `  ❌ Debut de travail a 12h = 3h de fenetre d'or\n`;
    message += `  ❌ Tu perds 2h de travail productif demain\n`;

    if (urgentTomorrow.length > 0) {
      message += `\nDemain, tu dois :\n`;
      urgentTomorrow.forEach((t) => {
        message += `  - ${t.title}\n`;
      });
    }

    message += `\nBonne nuit !`;

    await bot.api.sendMessage(chatId, message);
    logger.info('Midnight reminder sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send midnight reminder');
  }
}
