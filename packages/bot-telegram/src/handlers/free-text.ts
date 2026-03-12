import type { Bot, Context } from 'grammy';
import { processWithOrchestrator, runResearchAgent, processMemoryRequest, logger } from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';
import { addMessage, formatHistoryForPrompt } from '../utils/conversation.js';

const TELEGRAM_MAX_LENGTH = 4096;

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  if (text.length <= TELEGRAM_MAX_LENGTH) {
    await ctx.reply(text);
    return;
  }

  // Split by double newlines (paragraph boundaries) to keep sections intact
  const paragraphs = text.split('\n\n');
  let current = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit, send current chunk
    if (current.length + paragraph.length + 2 > TELEGRAM_MAX_LENGTH) {
      if (current.trim()) {
        await ctx.reply(current.trim());
      }
      // If a single paragraph exceeds the limit, split it by lines
      if (paragraph.length > TELEGRAM_MAX_LENGTH) {
        const lines = paragraph.split('\n');
        current = '';
        for (const line of lines) {
          if (current.length + line.length + 1 > TELEGRAM_MAX_LENGTH) {
            if (current.trim()) await ctx.reply(current.trim());
            current = line + '\n';
          } else {
            current += line + '\n';
          }
        }
      } else {
        current = paragraph + '\n\n';
      }
    } else {
      current += paragraph + '\n\n';
    }
  }

  if (current.trim()) {
    await ctx.reply(current.trim());
  }
}

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

      // Check if memory management was triggered
      const memoryAction = result.actions.find((a) => a.type === 'manage_memory');

      if (memoryAction) {
        addMessage(chatId, 'assistant', result.response);
        await ctx.reply(result.response);

        try {
          const memoryResult = await processMemoryRequest({
            userMessage: text,
            conversationHistory: history,
          });
          await sendLongMessage(ctx, memoryResult.response);
          addMessage(chatId, 'assistant', memoryResult.response);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error({ err: errMsg }, 'Memory manager failed');
          await ctx.reply('Erreur lors de la modification memoire. Reessaie.');
        }
        return;
      }

      // Check if a research was triggered
      const researchAction = result.actions.find((a) => a.type === 'start_research');

      if (researchAction) {
        const topic = String(researchAction.data['topic'] ?? '');
        const details = String(researchAction.data['details'] ?? '');
        const includeMemory = Boolean(researchAction.data['include_memory']);

        // Send the orchestrator's response first
        addMessage(chatId, 'assistant', result.response);
        await ctx.reply(result.response);

        try {
          const research = await runResearchAgent({ topic, details, includeMemory });

          // Send research as text messages (split if needed)
          await sendLongMessage(ctx, research.content);

          addMessage(chatId, 'assistant', `Recherche envoyee : ${topic}`);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error({ err: errMsg, topic }, 'Research agent failed');
          await ctx.reply(`Erreur lors de la recherche : ${errMsg}\nEssaie de reformuler ou redemande.`);
        }
        return;
      }

      // Normal flow
      addMessage(chatId, 'assistant', result.response);
      await ctx.reply(result.response);
    } catch (error) {
      logger.error({ error, text }, 'Failed to process free text');
      await ctx.reply('Erreur de traitement. Renvoie ton message ou essaie un vocal.');
    }
  });
}
