import type { Bot, Context } from 'grammy';
import {
  transcribeAudio,
  processWithOrchestrator,
  logger,
} from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';

export function registerVoiceHandler(bot: Bot): void {
  bot.on('message:voice', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    try {
      await ctx.reply('🎙️ J\'ecoute...');

      // Download voice file
      const voice = ctx.message?.voice;
      if (!voice) return;

      const file = await ctx.api.getFile(voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env['TELEGRAM_BOT_TOKEN']}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Transcribe
      const text = await transcribeAudio(buffer, 'voice.ogg');

      if (!text || text.trim().length === 0) {
        await ctx.reply('Je n\'ai pas compris le message vocal. Essaie encore ?');
        return;
      }

      // Show transcription
      await ctx.reply(`📝 "${text}"`);

      // Process through orchestrator
      const result = await processWithOrchestrator(text);
      await ctx.reply(result.response);

    } catch (error) {
      logger.error({ error }, 'Failed to process voice message');
      await ctx.reply('Erreur lors du traitement du vocal. Essaie en texte ou renvoie le vocal.');
    }
  });
}
