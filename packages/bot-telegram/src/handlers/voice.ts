import type { Bot, Context } from 'grammy';
import { transcribeAudio, processWithOrchestrator, runResearchAgent, logger } from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';
import { addMessage, formatHistoryForPrompt } from '../utils/conversation.js';

const TELEGRAM_MAX_LENGTH = 4096;

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  if (text.length <= TELEGRAM_MAX_LENGTH) {
    await ctx.reply(text);
    return;
  }

  const paragraphs = text.split('\n\n');
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > TELEGRAM_MAX_LENGTH) {
      if (current.trim()) await ctx.reply(current.trim());
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

  if (current.trim()) await ctx.reply(current.trim());
}

export function registerVoiceHandler(bot: Bot): void {
  bot.on('message:voice', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    try {
      await ctx.reply('🎙️ J\'ecoute...');

      const voice = ctx.message?.voice;
      if (!voice) return;

      const file = await ctx.api.getFile(voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env['TELEGRAM_BOT_TOKEN']}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const text = await transcribeAudio(buffer, 'voice.ogg');

      if (!text || text.trim().length === 0) {
        await ctx.reply('Je n\'ai pas compris le message vocal. Essaie encore ?');
        return;
      }

      await ctx.reply(`📝 "${text}"`);

      const chatId = String(ctx.chat?.id);
      addMessage(chatId, 'user', text);
      const history = formatHistoryForPrompt(chatId);

      const result = await processWithOrchestrator(text, history);

      const researchAction = result.actions.find((a) => a.type === 'start_research');

      if (researchAction) {
        const topic = String(researchAction.data['topic'] ?? '');
        const details = String(researchAction.data['details'] ?? '');
        const includeMemory = Boolean(researchAction.data['include_memory']);

        addMessage(chatId, 'assistant', result.response);
        await ctx.reply(result.response);

        try {
          const research = await runResearchAgent({ topic, details, includeMemory });
          await sendLongMessage(ctx, research.content);
          addMessage(chatId, 'assistant', `Recherche envoyee : ${topic}`);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error({ err: errMsg, topic }, 'Research agent failed');
          await ctx.reply(`Erreur lors de la recherche : ${errMsg}\nEssaie de reformuler ou redemande.`);
        }
        return;
      }

      addMessage(chatId, 'assistant', result.response);
      await ctx.reply(result.response);

    } catch (error) {
      logger.error({ error }, 'Failed to process voice message');
      await ctx.reply('Erreur lors du traitement du vocal. Essaie en texte ou renvoie le vocal.');
    }
  });
}
