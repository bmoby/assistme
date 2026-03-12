import type { Bot, Context } from 'grammy';
import { InputFile } from 'grammy';
import { processWithOrchestrator, runResearchAgent, logger } from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';
import { addMessage, formatHistoryForPrompt } from '../utils/conversation.js';
import { generateResearchPDF } from '../utils/pdf-generator.js';

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

      // Check if a research was triggered
      const researchAction = result.actions.find((a) => a.type === 'start_research');

      if (researchAction) {
        const topic = String(researchAction.data['topic'] ?? '');
        const details = String(researchAction.data['details'] ?? '');
        const includeMemory = Boolean(researchAction.data['include_memory']);

        // Send the orchestrator's response first (usually "Je lance la recherche...")
        addMessage(chatId, 'assistant', result.response);
        await ctx.reply(result.response);

        // Run research in background
        try {
          const research = await runResearchAgent({
            topic,
            details,
            includeMemory,
          });

          // Generate PDF
          const pdfBuffer = await generateResearchPDF(research);

          // Create safe filename
          const safeTitle = research.title
            .replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 50);
          const filename = `${safeTitle}.pdf`;

          // Send PDF
          await ctx.replyWithDocument(new InputFile(pdfBuffer, filename), {
            caption: `📄 ${research.title}\n\n${research.summary.slice(0, 200)}${research.summary.length > 200 ? '...' : ''}`,
          });

          addMessage(chatId, 'assistant', `PDF envoye : ${research.title}`);
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
