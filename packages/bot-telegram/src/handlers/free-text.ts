import type { Bot, Context } from 'grammy';
import {
  processWithOrchestrator,
  upsertMemory,
  deleteMemory,
  upsertPublicKnowledge,
  deletePublicKnowledge,
  getMemoryEntry,
  logger,
} from '@vibe-coder/core';
import type { MemoryCategory, PublicKnowledgeCategory } from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';
import {
  getPending,
  setPending,
  clearPending,
  isConfirmation,
  isRejection,
  type PendingChange,
} from '../utils/pending-changes.js';

async function executeChange(change: PendingChange): Promise<string> {
  if (change.target === 'memory') {
    if (change.action === 'delete') {
      await deleteMemory(change.category as MemoryCategory, change.key);
      return `Supprime : [${change.category}/${change.key}]`;
    } else {
      await upsertMemory({
        category: change.category as MemoryCategory,
        key: change.key,
        content: change.newContent!,
        source: 'admin_manual',
      });
      return `Mis a jour : [${change.category}/${change.key}]`;
    }
  } else {
    if (change.action === 'delete') {
      await deletePublicKnowledge(change.category as PublicKnowledgeCategory, change.key);
      return `Supprime du bot public : [${change.category}/${change.key}]`;
    } else {
      await upsertPublicKnowledge({
        category: change.category as PublicKnowledgeCategory,
        key: change.key,
        content: change.newContent!,
      });
      return `Mis a jour dans le bot public : [${change.category}/${change.key}]`;
    }
  }
}

export function registerFreeText(bot: Bot): void {
  bot.on('message:text', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message?.text;
    if (!text || text.startsWith('/')) return;

    const chatId = String(ctx.chat?.id);

    try {
      // Check for pending confirmation
      const pending = getPending(chatId);
      if (pending) {
        if (isConfirmation(text)) {
          const result = await executeChange(pending);
          clearPending(chatId);
          await ctx.reply(`✅ ${result}`);
          return;
        }
        if (isRejection(text)) {
          clearPending(chatId);
          await ctx.reply('Annule.');
          return;
        }
        // Neither confirm nor reject — clear pending and process as new message
        clearPending(chatId);
      }

      // Normal orchestrator flow
      const result = await processWithOrchestrator(text);

      // Check if orchestrator proposed a memory/kb change
      const changeAction = result.actions.find(
        (a) => a.type === 'update_memory' || a.type === 'update_kb'
      );

      if (changeAction) {
        const target = changeAction.type === 'update_memory' ? 'memory' : 'kb';
        const action = String(changeAction.data['action'] ?? 'update') as 'create' | 'update' | 'delete';
        const category = String(changeAction.data['category'] ?? '');
        const key = String(changeAction.data['key'] ?? '');
        const newContent = String(changeAction.data['content'] ?? '');

        // Look up current content for context
        let oldContent: string | null = null;
        if (target === 'memory' && action !== 'create') {
          try {
            const existing = await getMemoryEntry(category as MemoryCategory, key);
            oldContent = existing?.content ?? null;
          } catch {
            // ignore
          }
        }

        setPending(chatId, {
          target,
          action,
          category,
          key,
          oldContent,
          newContent: action === 'delete' ? null : newContent,
          timestamp: Date.now(),
        });
      }

      await ctx.reply(result.response);
    } catch (error) {
      logger.error({ error, text }, 'Failed to process free text');
      await ctx.reply('Erreur de traitement. Renvoie ton message ou essaie un vocal.');
    }
  });
}
