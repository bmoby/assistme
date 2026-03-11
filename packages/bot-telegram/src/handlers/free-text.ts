import type { Bot, Context } from 'grammy';
import {
  processWithOrchestrator,
  upsertMemory,
  deleteMemory,
  upsertPublicKnowledge,
  deletePublicKnowledge,
  getMemoryEntry,
  getPublicKnowledgeEntry,
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
import { addMessage, formatHistoryForPrompt } from '../utils/conversation.js';

async function executeChange(change: PendingChange): Promise<string> {
  if (change.target === 'memory') {
    if (change.action === 'delete') {
      await deleteMemory(change.category as MemoryCategory, change.key);
      return `Supprime de la memoire : [${change.category}/${change.key}]`;
    } else {
      await upsertMemory({
        category: change.category as MemoryCategory,
        key: change.key,
        content: change.newContent!,
        source: 'admin_manual',
      });
      return `Memoire mise a jour : [${change.category}/${change.key}] → "${change.newContent!.slice(0, 80)}${change.newContent!.length > 80 ? '...' : ''}"`;
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
      return `Bot public mis a jour : [${change.category}/${change.key}] → "${change.newContent!.slice(0, 80)}${change.newContent!.length > 80 ? '...' : ''}"`;
    }
  }
}

async function executeActionDirectly(action: { type: string; data: Record<string, unknown> }): Promise<string> {
  const target = action.type === 'update_memory' ? 'memory' : 'kb';
  const changeAction = String(action.data['action'] ?? 'update') as 'create' | 'update' | 'delete';
  const category = String(action.data['category'] ?? '');
  const key = String(action.data['key'] ?? '');
  const content = String(action.data['content'] ?? '');

  const change: PendingChange = {
    target,
    action: changeAction,
    category,
    key,
    oldContent: null,
    newContent: changeAction === 'delete' ? null : content,
    timestamp: Date.now(),
  };

  return executeChange(change);
}

export function registerFreeText(bot: Bot): void {
  bot.on('message:text', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message?.text;
    if (!text || text.startsWith('/')) return;

    const chatId = String(ctx.chat?.id);

    try {
      // Track user message in history
      addMessage(chatId, 'user', text);

      // Check for pending confirmation
      const pending = getPending(chatId);
      if (pending) {
        if (isConfirmation(text)) {
          try {
            const result = await executeChange(pending);
            clearPending(chatId);
            const reply = `✅ ${result}`;
            addMessage(chatId, 'assistant', reply);
            await ctx.reply(reply);
          } catch (error) {
            clearPending(chatId);
            logger.error({ error, pending }, 'Failed to execute pending change');
            await ctx.reply('Erreur lors de la modification. Essaie via /kb set ou redemande-moi.');
          }
          return;
        }
        if (isRejection(text)) {
          clearPending(chatId);
          const reply = 'Annule.';
          addMessage(chatId, 'assistant', reply);
          await ctx.reply(reply);
          return;
        }
        // Neither confirm nor reject — clear pending and process as new message
        clearPending(chatId);
      }

      // Get conversation history for context
      const history = formatHistoryForPrompt(chatId);

      // Normal orchestrator flow with conversation history
      const result = await processWithOrchestrator(text, history);

      // Check if orchestrator proposed a memory/kb change
      const changeAction = result.actions.find(
        (a) => a.type === 'update_memory' || a.type === 'update_kb'
      );

      if (changeAction) {
        const userIsConfirming = isConfirmation(text);

        if (userIsConfirming) {
          // User is confirming via conversation flow (pending wasn't stored previously)
          // Execute directly — the orchestrator understood the confirmation from history
          try {
            const execResult = await executeActionDirectly(changeAction);
            const reply = `${result.response}\n\n✅ ${execResult}`;
            addMessage(chatId, 'assistant', reply);
            await ctx.reply(reply);
          } catch (error) {
            logger.error({ error, changeAction }, 'Failed to execute direct change');
            addMessage(chatId, 'assistant', result.response);
            await ctx.reply(result.response);
          }
          return;
        }

        // First time proposal — store as pending for confirmation
        const target = changeAction.type === 'update_memory' ? 'memory' : 'kb';
        const action = String(changeAction.data['action'] ?? 'update') as 'create' | 'update' | 'delete';
        const category = String(changeAction.data['category'] ?? '');
        const key = String(changeAction.data['key'] ?? '');
        const newContent = String(changeAction.data['content'] ?? '');

        let oldContent: string | null = null;
        if (action !== 'create') {
          try {
            if (target === 'memory') {
              const existing = await getMemoryEntry(category as MemoryCategory, key);
              oldContent = existing?.content ?? null;
            } else {
              const existing = await getPublicKnowledgeEntry(category as PublicKnowledgeCategory, key);
              oldContent = existing?.content ?? null;
            }
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

      // Track bot response in history
      addMessage(chatId, 'assistant', result.response);
      await ctx.reply(result.response);
    } catch (error) {
      logger.error({ error, text }, 'Failed to process free text');
      await ctx.reply('Erreur de traitement. Renvoie ton message ou essaie un vocal.');
    }
  });
}
