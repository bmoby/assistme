import { getAllMemory, type MemoryEntry } from '../db/memory.js';
import { getActiveTasks } from '../db/tasks.js';
import { getClientPipeline } from '../db/clients.js';
import { getAllPublicKnowledge } from '../db/public-knowledge.js';
import { logger } from '../logger.js';

/**
 * Builds dynamic context from 3 layers:
 * 1. Memory (identity + situation + preferences + lessons)
 * 2. Live data (tasks, clients)
 * 3. Temporal (date, time)
 */
export async function buildContext(): Promise<string> {
  try {
    // Layer 1: Memory
    const allMemory = await getAllMemory();
    const identity = allMemory.filter((m) => m.category === 'identity');
    const situation = allMemory.filter((m) => m.category === 'situation');
    const preferences = allMemory.filter((m) => m.category === 'preference');
    const relationships = allMemory.filter((m) => m.category === 'relationship');
    const lessons = allMemory.filter((m) => m.category === 'lesson');

    // Layer 2: Live data
    const activeTasks = await getActiveTasks();
    const clients = await getClientPipeline();

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

    // Identity
    if (identity.length > 0) {
      context += 'QUI EST MAGOMED :\n';
      context += formatEntries(identity);
      context += '\n';
    }

    // Situation
    if (situation.length > 0) {
      context += 'SITUATION ACTUELLE :\n';
      context += formatEntries(situation);
      context += '\n';
    }

    // Preferences
    if (preferences.length > 0) {
      context += 'PREFERENCES ET FONCTIONNEMENT :\n';
      context += formatEntries(preferences);
      context += '\n';
    }

    // Relationships (only if relevant)
    if (relationships.length > 0) {
      context += 'PERSONNES CONNUES :\n';
      context += formatEntries(relationships);
      context += '\n';
    }

    // Lessons
    if (lessons.length > 0) {
      context += 'LECONS APPRISES :\n';
      context += formatEntries(lessons);
      context += '\n';
    }

    // Live tasks
    context += `TACHES ACTIVES (${activeTasks.length}) :\n`;
    if (activeTasks.length === 0) {
      context += '- Aucune tache\n';
    } else {
      for (const t of activeTasks.slice(0, 15)) {
        const due = t.due_date ? ` (deadline: ${t.due_date})` : '';
        context += `- [${t.priority}] ${t.title} (${t.category})${due}\n`;
      }
      if (activeTasks.length > 15) {
        context += `  ... et ${activeTasks.length - 15} autres\n`;
      }
    }
    context += '\n';

    // Live clients
    context += `CLIENTS (${clients.length}) :\n`;
    if (clients.length === 0) {
      context += '- Aucun client dans le pipeline\n';
    } else {
      for (const c of clients) {
        context += `- ${c.name} [${c.status}]${c.need ? ` - ${c.need}` : ''}${c.budget_range ? ` (${c.budget_range})` : ''}\n`;
      }
    }
    context += '\n';

    // Public knowledge (full content, for memory management)
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
