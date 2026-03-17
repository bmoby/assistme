import type { Bot, Context } from 'grammy';
import {
  getAllPublicKnowledge,
  upsertPublicKnowledge,
  deletePublicKnowledge,
  logger,
} from '@assistme/core';
import type { PublicKnowledgeCategory } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';

const VALID_CATEGORIES: PublicKnowledgeCategory[] = ['formation', 'services', 'faq', 'free_courses', 'general'];

/**
 * /kb - View all public knowledge
 * /kb [category] - View knowledge by category
 * /kb set [category] [key] [content] - Add/update an entry
 * /kb del [category] [key] - Delete an entry
 */
export function registerKbCommand(bot: Bot): void {
  bot.command('kb', async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message?.text ?? '';
    const args = text.replace('/kb', '').trim();

    try {
      // /kb - show all
      if (!args) {
        const all = await getAllPublicKnowledge();
        if (all.length === 0) {
          await ctx.reply('Base de connaissances publique vide.');
          return;
        }

        const grouped: Record<string, string[]> = {};
        for (const entry of all) {
          if (!grouped[entry.category]) grouped[entry.category] = [];
          grouped[entry.category]!.push(`  • ${entry.key}: ${entry.content.slice(0, 80)}${entry.content.length > 80 ? '...' : ''}`);
        }

        let msg = '📚 Base de connaissances publique :\n\n';
        for (const [cat, entries] of Object.entries(grouped)) {
          msg += `[${cat.toUpperCase()}]\n${entries.join('\n')}\n\n`;
        }
        msg += `Total : ${all.length} entrees`;
        await ctx.reply(msg);
        return;
      }

      // /kb set [category] [key] [content]
      if (args.startsWith('set ')) {
        const parts = args.slice(4).trim();
        const match = parts.match(/^(\S+)\s+(\S+)\s+(.+)$/s);
        if (!match) {
          await ctx.reply('Usage : /kb set [categorie] [cle] [contenu]\nCategories : formation, services, faq, free_courses, general');
          return;
        }

        const [, category, key, content] = match;
        if (!VALID_CATEGORIES.includes(category as PublicKnowledgeCategory)) {
          await ctx.reply(`Categorie invalide. Valides : ${VALID_CATEGORIES.join(', ')}`);
          return;
        }

        await upsertPublicKnowledge({
          category: category as PublicKnowledgeCategory,
          key: key!,
          content: content!,
        });
        await ctx.reply(`✅ [${category}/${key}] mis a jour.`);
        return;
      }

      // /kb del [category] [key]
      if (args.startsWith('del ')) {
        const parts = args.slice(4).trim().split(/\s+/);
        if (parts.length < 2) {
          await ctx.reply('Usage : /kb del [categorie] [cle]');
          return;
        }

        const [category, key] = parts;
        await deletePublicKnowledge(category as PublicKnowledgeCategory, key!);
        await ctx.reply(`🗑️ [${category}/${key}] supprime.`);
        return;
      }

      // /kb [category] - show specific category
      if (VALID_CATEGORIES.includes(args as PublicKnowledgeCategory)) {
        const entries = await getAllPublicKnowledge();
        const filtered = entries.filter((e) => e.category === args);
        if (filtered.length === 0) {
          await ctx.reply(`Aucune entree dans la categorie "${args}".`);
          return;
        }

        let msg = `📚 [${args.toUpperCase()}] :\n\n`;
        for (const entry of filtered) {
          msg += `• ${entry.key}: ${entry.content}\n\n`;
        }
        await ctx.reply(msg);
        return;
      }

      // Unknown subcommand
      await ctx.reply(
        'Usage :\n' +
        '/kb — Voir tout\n' +
        '/kb [categorie] — Voir une categorie\n' +
        '/kb set [categorie] [cle] [contenu] — Ajouter/modifier\n' +
        '/kb del [categorie] [cle] — Supprimer\n\n' +
        'Categories : formation, services, faq, free_courses, general'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to manage public knowledge');
      await ctx.reply('Erreur lors de la gestion de la base de connaissances.');
    }
  });
}
