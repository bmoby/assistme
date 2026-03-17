import type { Bot } from 'grammy';
import { getActiveTasks, getClientPipeline, logger } from '@assistme/core';

// Morning check-in: ask for updates
export async function morningCheckIn(bot: Bot, chatId: string): Promise<void> {
  try {
    const tasks = await getActiveTasks();
    const clients = await getClientPipeline();

    const pendingClients = clients.filter((c) => c.status === 'lead' || c.status === 'qualified');
    const urgentTasks = tasks.filter((t) => t.priority === 'urgent');

    let message = `☀️ Bonjour !\n\n`;

    if (urgentTasks.length > 0) {
      message += `Tu as ${urgentTasks.length} tache(s) urgente(s) :\n`;
      urgentTasks.forEach((t) => {
        message += `  - ${t.title}\n`;
      });
      message += '\n';
    }

    if (pendingClients.length > 0) {
      message += `${pendingClients.length} client(s) en attente de reponse :\n`;
      pendingClients.forEach((c) => {
        message += `  - ${c.name}${c.need ? ` (${c.need})` : ''}\n`;
      });
      message += '\n';
    }

    message += `Des nouvelles a me donner ce matin ?\n`;
    message += `Envoie un vocal ou un message avec ce qui est nouveau.`;

    await bot.api.sendMessage(chatId, message);
    logger.info('Morning check-in sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send morning check-in');
  }
}

// Midday check-in: how's it going?
export async function middayCheckIn(bot: Bot, chatId: string): Promise<void> {
  try {
    const tasks = await getActiveTasks();
    const doneToday = tasks.filter(
      (t) => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().split('T')[0]!)
    );

    let message = '';

    if (doneToday.length > 0) {
      message += `👍 Tu as deja fait ${doneToday.length} tache(s) aujourd'hui.\n\n`;
    } else {
      message += `⏰ C'est l'apres-midi. Comment ca avance ?\n\n`;
    }

    message += `Du nouveau depuis ce matin ? Un client, un message, quelque chose a ajouter ?\n`;
    message += `Un petit vocal et je m'occupe du reste.`;

    await bot.api.sendMessage(chatId, message);
    logger.info('Midday check-in sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send midday check-in');
  }
}

// Evening review: wrap up the day
export async function eveningReview(bot: Bot, chatId: string): Promise<void> {
  try {
    const tasks = await getActiveTasks();
    const today = new Date().toISOString().split('T')[0]!;
    const doneToday = tasks.filter(
      (t) => t.status === 'done' && t.completed_at?.startsWith(today)
    );
    const remaining = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');

    let message = `🌆 Bilan de la journee :\n\n`;

    if (doneToday.length > 0) {
      message += `✅ Fait aujourd'hui (${doneToday.length}) :\n`;
      doneToday.forEach((t) => {
        message += `  - ${t.title}\n`;
      });
      message += '\n';
    } else {
      message += `Rien de marque comme fait aujourd'hui.\n\n`;
    }

    if (remaining.length > 0) {
      message += `📋 En attente (${remaining.length}) :\n`;
      remaining.slice(0, 5).forEach((t) => {
        message += `  - ${t.title}\n`;
      });
      if (remaining.length > 5) {
        message += `  ... et ${remaining.length - 5} autres\n`;
      }
      message += '\n';
    }

    message += `Quelque chose a ajouter pour demain ? Un dernier vocal avant de finir ?\n`;
    message += `Sinon, bonne soiree !`;

    await bot.api.sendMessage(chatId, message);
    logger.info('Evening review sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send evening review');
  }
}
