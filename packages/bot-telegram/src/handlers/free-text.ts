import type { Bot, Context } from 'grammy';
import { processWithOrchestrator, logger } from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';
import { addMessage, formatHistoryForPrompt } from '../utils/conversation.js';

export function registerFreeText(bot: Bot): void {
  bot.on('message:text', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message?.text;
    if (!text || text.startsWith('/')) return;

    const chatId = String(ctx.chat?.id);

    try {
      addMessage(chatId, 'user', text);
      const history = formatHistoryForPrompt(chatId);

      const result = await processWithOrchestrator(text, history);

      addMessage(chatId, 'assistant', result.response);
      await ctx.reply(result.response);
    } catch (error) {
      logger.error({ error, text }, 'Failed to process free text');
      await ctx.reply('Erreur de traitement. Renvoie ton message ou essaie un vocal.');
    }
  });
}
