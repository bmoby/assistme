import { askClaude } from './client.js';
import type { Task, DailyPlanTask } from '../types/index.js';
import { logger } from '../logger.js';

const PLANNER_SYSTEM_PROMPT = `Tu es l'assistant personnel de Magomed, un developpeur expert et formateur tech.

CONTEXTE DE MAGOMED :
- Fenetre productive : 10h-15h (a proteger absolument pour le deep work)
- Apres 15h : taches legeres seulement (reponses, reviews, planification)
- Il fonctionne avec des objectifs concrets et des victoires rapides
- Il est motive par la peur de perdre quelque chose et par la progression visible
- Il est paralyse quand il a trop de choix → tu dois choisir pour lui
- Il a besoin qu'on decide pour lui quand il hesite

REGLES DE PRIORISATION :
1. URGENT + deadline proche = en premier (slot "urgent", max 2-3)
2. Taches qui debloquent d'autres personnes (equipe, clients, etudiants) = prioritaires
3. Maximum 3 taches "urgent" par jour (sinon paralysie)
4. TOUJOURS commencer par une tache rapide (<15 min) pour lancer la dynamique
5. Apres 15h : taches legeres uniquement
6. Si pas de sport depuis 3+ jours, integrer une session
7. Total : 5-7 taches max par jour (pas plus)

FORMAT DE REPONSE :
Tu dois repondre UNIQUEMENT en JSON valide, sans markdown, sans commentaire.
Le JSON doit etre un tableau d'objets avec ces champs :
- task_id: string (l'id de la tache)
- title: string
- category: string
- priority: string
- estimated_minutes: number ou null
- time_slot: "urgent" | "important" | "optional"
- order: number (1 = premiere tache a faire)`;

export async function generateDailyPlan(params: {
  activeTasks: Task[];
  overdueTasks: Task[];
  dayOfWeek: string;
  sportDoneRecently: boolean;
}): Promise<DailyPlanTask[]> {
  const { activeTasks, overdueTasks, dayOfWeek, sportDoneRecently } = params;

  if (activeTasks.length === 0 && overdueTasks.length === 0) {
    logger.info('No tasks to plan');
    return [];
  }

  const allTasks = [...overdueTasks, ...activeTasks];
  const tasksSummary = allTasks.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    estimated_minutes: t.estimated_minutes,
    notes: t.notes,
  }));

  const prompt = `Aujourd'hui c'est ${dayOfWeek}.
Sport fait recemment : ${sportDoneRecently ? 'Oui' : 'Non (3+ jours sans sport)'}

Voici toutes les taches actives et en retard :
${JSON.stringify(tasksSummary, null, 2)}

Genere le plan du jour. Rappel : max 5-7 taches, commence par une rapide.`;

  const response = await askClaude({
    prompt,
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    model: 'sonnet',
  });

  try {
    const parsed = JSON.parse(response) as DailyPlanTask[];
    logger.info({ taskCount: parsed.length }, 'Daily plan generated');
    return parsed;
  } catch {
    logger.error({ response }, 'Failed to parse daily plan from Claude');
    // Fallback: return top tasks manually sorted
    return allTasks.slice(0, 5).map((t, i) => ({
      task_id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      estimated_minutes: t.estimated_minutes,
      time_slot: i < 2 ? ('urgent' as const) : i < 4 ? ('important' as const) : ('optional' as const),
      order: i + 1,
    }));
  }
}

export async function parseUserMessage(message: string, context: {
  activeTasks: Task[];
  clientNames: string[];
  studentNames: string[];
}): Promise<{
  intent: 'create_task' | 'complete_task' | 'create_client' | 'create_reminder' | 'question' | 'unknown';
  data: Record<string, unknown>;
}> {
  const systemPrompt = `Tu es l'assistant personnel de Magomed. L'utilisateur envoie un message en texte libre.
Tu dois determiner l'intention et extraire les donnees.

Contexte actuel :
- Taches actives : ${context.activeTasks.map((t) => t.title).join(', ') || 'aucune'}
- Clients connus : ${context.clientNames.join(', ') || 'aucun'}
- Etudiants connus : ${context.studentNames.join(', ') || 'aucun'}

INTENTIONS POSSIBLES :
- create_task : L'utilisateur veut ajouter une tache
- complete_task : L'utilisateur dit qu'il a fini quelque chose
- create_client : L'utilisateur mentionne un nouveau client/lead
- create_reminder : L'utilisateur veut un rappel pour plus tard
- question : L'utilisateur pose une question
- unknown : Pas clair

Reponds UNIQUEMENT en JSON :
{
  "intent": "...",
  "data": {
    // Pour create_task : { "title", "category", "priority", "due_date", "estimated_minutes" }
    // Pour complete_task : { "task_title_match" } (le titre ou partie du titre de la tache)
    // Pour create_client : { "name", "need", "budget_range", "phone", "source" }
    // Pour create_reminder : { "message", "trigger_at" } (ISO date)
    // Pour question : { "question" }
    // Pour unknown : { "raw_message" }
  },
  "confirmation_message": "..." // Message court a envoyer a l'utilisateur pour confirmer
}`;

  const response = await askClaude({
    prompt: message,
    systemPrompt,
    model: 'sonnet',
  });

  try {
    return JSON.parse(response) as {
      intent: 'create_task' | 'complete_task' | 'create_client' | 'create_reminder' | 'question' | 'unknown';
      data: Record<string, unknown>;
    };
  } catch {
    logger.error({ response }, 'Failed to parse user message intent');
    return {
      intent: 'unknown',
      data: { raw_message: message },
    };
  }
}
