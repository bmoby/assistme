import { getCoreMemory, getWorkingMemory, searchMemoryHybrid, computeDecay, type MemoryEntry } from '../db/memory.js';
import { getActiveTasks } from '../db/tasks.js';
import { getClientPipeline } from '../db/clients.js';
import { getAllPublicKnowledge } from '../db/public-knowledge.js';
import { getEmbedding } from './embeddings.js';
import { logger } from '../logger.js';

export interface BuildContextOptions {
  includePublicKnowledge?: boolean;
  maxTasks?: number;
  userMessage?: string;
}

/**
 * Builds dynamic context from 3 tiers:
 * - Tier 1 (core): always loaded (~300 tokens) — identity
 * - Tier 2 (working): loaded with temporal decay sorting — recent first, fading old ones
 * - Tier 3 (archival): hybrid search (BM25 + vector + decay) when userMessage provided
 * - Live data: tasks, clients (filtered)
 * - Temporal: date, time
 */
export async function buildContext(options?: BuildContextOptions): Promise<string> {
  try {
    const maxTasks = options?.maxTasks ?? 15;

    // Layer 1: Tier-based memory (core + working only)
    const [coreMemory, workingMemory] = await Promise.all([
      getCoreMemory(),
      getWorkingMemory(),
    ]);

    // Layer 2: Live data
    const [activeTasks, clients] = await Promise.all([
      getActiveTasks(),
      getClientPipeline(),
    ]);

    // Layer 3: Temporal
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let context = '';

    // Core memory (identity — always present, no decay)
    if (coreMemory.length > 0) {
      context += 'QUI EST MAGOMED :\n';
      context += formatEntries(coreMemory);
      context += '\n';
    }

    // Working memory — sorted by freshness (temporal decay)
    if (workingMemory.length > 0) {
      // Sort by decay score descending (most recent/confirmed first)
      const withDecay = workingMemory.map((m) => ({
        entry: m,
        decay: computeDecay(m.last_confirmed),
      }));
      withDecay.sort((a, b) => b.decay - a.decay);

      // Split into fresh (decay > 0.5 = less than 30 days) and fading
      const fresh = withDecay.filter((d) => d.decay > 0.5);
      const fading = withDecay.filter((d) => d.decay <= 0.5);

      // Group fresh entries by category
      const freshByCategory = groupByCategory(fresh.map((d) => d.entry));

      if (freshByCategory.situation.length > 0) {
        context += 'SITUATION ACTUELLE :\n';
        context += formatEntries(freshByCategory.situation);
        context += '\n';
      }

      if (freshByCategory.preference.length > 0) {
        context += 'PREFERENCES ET FONCTIONNEMENT :\n';
        context += formatEntries(freshByCategory.preference);
        context += '\n';
      }

      if (freshByCategory.relationship.length > 0) {
        context += 'PERSONNES CONNUES :\n';
        context += formatEntries(freshByCategory.relationship);
        context += '\n';
      }

      // Fading entries — condensed, just keys (save tokens)
      if (fading.length > 0) {
        const fadingKeys = fading.map((d) => d.entry.key).join(', ');
        context += `MEMOIRE ANCIENNE (${fading.length}, confirmee il y a >30j) : ${fadingKeys}\n\n`;
      }
    }

    // Live tasks
    context += `TACHES ACTIVES (${activeTasks.length}) :\n`;
    if (activeTasks.length === 0) {
      context += '- Aucune tache\n';
    } else {
      for (const t of activeTasks.slice(0, maxTasks)) {
        const due = t.due_date ? ` (deadline: ${t.due_date})` : '';
        context += `- [${t.priority}] ${t.title} (${t.category})${due}\n`;
      }
      if (activeTasks.length > maxTasks) {
        context += `  ... et ${activeTasks.length - maxTasks} autres\n`;
      }
    }
    context += '\n';

    // Live clients — filter out terminated clients older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const terminalStatuses = new Set(['delivered', 'paid']);
    const activeClients = clients.filter((c) => {
      if (!terminalStatuses.has(c.status)) return true;
      return new Date(c.updated_at) > sevenDaysAgo;
    });

    context += `CLIENTS (${activeClients.length}) :\n`;
    if (activeClients.length === 0) {
      context += '- Aucun client dans le pipeline\n';
    } else {
      for (const c of activeClients) {
        context += `- ${c.name} [${c.status}]${c.need ? ` - ${c.need}` : ''}${c.budget_range ? ` (${c.budget_range})` : ''}\n`;
      }
    }
    context += '\n';

    // Public knowledge — only if explicitly requested
    if (options?.includePublicKnowledge) {
      try {
        const publicKnowledge = await getAllPublicKnowledge();
        if (publicKnowledge.length > 0) {
          context += `BASE DE CONNAISSANCES DU BOT PUBLIC (${publicKnowledge.length} entrees) :\n`;
          const grouped: Record<string, string[]> = {};
          for (const pk of publicKnowledge) {
            if (!grouped[pk.category]) grouped[pk.category] = [];
            grouped[pk.category]!.push(`${pk.key}: ${pk.content}`);
          }
          for (const [cat, entries] of Object.entries(grouped)) {
            context += `  [${cat}]\n`;
            for (const e of entries) {
              context += `  - ${e}\n`;
            }
          }
          context += '\n';
        }
      } catch {
        // Public knowledge table may not exist yet, ignore
      }
    }

    // Archival tier — hybrid search (BM25 + vector + decay) if user message provided
    if (options?.userMessage) {
      try {
        const queryEmbedding = await getEmbedding(options.userMessage);
        const archivalResults = await searchMemoryHybrid(
          options.userMessage,
          queryEmbedding,
          {
            matchCount: 3,
            tier: 'archival',
            threshold: 0.3,
          }
        );
        if (archivalResults.length > 0) {
          context += 'MEMOIRE ARCHIVEE PERTINENTE :\n';
          for (const r of archivalResults) {
            context += `- [${r.category}] ${r.key}: ${r.content}\n`;
          }
          context += '\n';
        }
      } catch {
        // Embedding server, pgvector, or FTS not available, skip silently
      }
    }

    // Temporal
    context += `DATE ET HEURE : ${dateStr}, ${timeStr}\n`;

    return context;
  } catch (error) {
    logger.error({ error }, 'Failed to build context');
    return 'Erreur lors de la construction du contexte. Donnees live indisponibles.';
  }
}

function formatEntries(entries: MemoryEntry[]): string {
  return entries.map((e) => `- ${e.key}: ${e.content}`).join('\n') + '\n';
}

interface GroupedEntries {
  situation: MemoryEntry[];
  preference: MemoryEntry[];
  relationship: MemoryEntry[];
}

function groupByCategory(entries: MemoryEntry[]): GroupedEntries {
  const result: GroupedEntries = { situation: [], preference: [], relationship: [] };
  for (const entry of entries) {
    if (entry.category in result) {
      result[entry.category as keyof GroupedEntries].push(entry);
    }
  }
  return result;
}
