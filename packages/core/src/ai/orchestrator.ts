import { askClaude } from './client.js';
import { buildContext } from './context-builder.js';
import { runMemoryAgent } from './memory-agent.js';
import {
  createTask,
  completeTask,
  getActiveTasks,
} from '../db/tasks.js';
import { createClient } from '../db/clients.js';
import { logger } from '../logger.js';

const ORCHESTRATOR_PROMPT = `Tu es le copilote personnel de Magomed, son assistant IA qui le connait parfaitement.

{context}

TON ROLE :
- Comprendre ce qu'il dit et AGIR automatiquement
- Creer des taches, des clients, des rappels selon ce qu'il raconte
- Organiser les informations sans qu'il ait a faire quoi que ce soit
- Prendre des DECISIONS pour lui quand c'est possible (il deteste choisir)
- Le motiver quand il avance, le pousser gentiment quand il stagne
- Repondre avec un ton direct, amical, bienveillant

REGLES :
- Si il parle d'un client ou d'une demande → cree un client
- Si il parle d'une chose a faire → cree une tache avec la bonne priorite et categorie
- Si il parle d'un etudiant ou de la formation → cree une tache categorie "student"
- Si il donne des nouvelles generales → note l'info
- Si il dit qu'il a fait quelque chose → marque comme fait
- Si il hesite entre plusieurs choses → choisis pour lui et explique pourquoi
- Tu peux faire PLUSIEURS actions en une seule reponse
- Reponds toujours en francais
- Sois CONCIS (max 4-5 lignes sauf si il demande plus)
- Utilise sa fenetre productive (10h-15h) pour prioriser
- Si il est apres 15h, suggere des taches legeres
- Rappelle ses objectifs quand c'est pertinent

FORMAT DE REPONSE (JSON strict, PAS de markdown autour) :
{
  "actions": [
    {
      "type": "create_task" | "complete_task" | "create_client" | "note",
      "data": { ... }
    }
  ],
  "response": "Message a envoyer a Magomed"
}

Pour create_task : data = { "title", "category" (client|student|content|personal|dev|team), "priority" (urgent|important|normal|low), "due_date" (YYYY-MM-DD ou null), "estimated_minutes" }
Pour complete_task : data = { "task_title_match" }
Pour create_client : data = { "name", "need", "budget_range", "source" }
Pour note : data = { "content" }`;

export interface OrchestratorResult {
  response: string;
  actions: Array<{ type: string; data: Record<string, unknown> }>;
}

export async function processWithOrchestrator(message: string): Promise<OrchestratorResult> {
  // Build dynamic context from memory + live data
  const context = await buildContext();
  const systemPrompt = ORCHESTRATOR_PROMPT.replace('{context}', context);

  // Call Claude
  const response = await askClaude({
    prompt: message,
    systemPrompt,
    model: 'sonnet',
  });

  // Parse response
  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: { actions: Array<{ type: string; data: Record<string, string> }>; response: string };
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    // If not valid JSON, return as plain text
    const cleanResponse = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    return { response: cleanResponse, actions: [] };
  }

  // Execute actions
  const executedActions: Array<{ type: string; data: Record<string, unknown> }> = [];

  for (const action of parsed.actions) {
    try {
      switch (action.type) {
        case 'create_task': {
          const task = await createTask({
            title: action.data['title'] ?? 'Tache sans titre',
            category: (action.data['category'] as 'personal') ?? 'personal',
            priority: (action.data['priority'] as 'normal') ?? 'normal',
            due_date: action.data['due_date'] ?? null,
            estimated_minutes: action.data['estimated_minutes']
              ? parseInt(action.data['estimated_minutes'], 10)
              : null,
            source: 'orchestrator',
            status: 'todo',
          });
          executedActions.push({ type: 'create_task', data: { id: task.id, title: task.title } });
          break;
        }
        case 'complete_task': {
          const match = action.data['task_title_match'];
          if (match) {
            const tasks = await getActiveTasks();
            const found = tasks.find((t) =>
              t.title.toLowerCase().includes(match.toLowerCase())
            );
            if (found) {
              await completeTask(found.id);
              executedActions.push({ type: 'complete_task', data: { id: found.id, title: found.title } });
            }
          }
          break;
        }
        case 'create_client': {
          const client = await createClient({
            name: action.data['name'] ?? 'Inconnu',
            need: action.data['need'] ?? null,
            budget_range: action.data['budget_range'] ?? null,
            source: action.data['source'] ?? 'conversation',
            status: 'lead',
          });
          executedActions.push({ type: 'create_client', data: { id: client.id, name: client.name } });
          break;
        }
        case 'note': {
          // Notes are handled by the memory agent
          executedActions.push({ type: 'note', data: { content: action.data['content'] } });
          break;
        }
      }
    } catch (error) {
      logger.error({ error, action }, 'Failed to execute action');
    }
  }

  // Run Memory Agent in background (don't wait)
  const actionsSummary = executedActions
    .map((a) => `${a.type}: ${JSON.stringify(a.data)}`)
    .join('\n') || 'Aucune action';

  runMemoryAgent({ message, actionsSummary }).catch((err) =>
    logger.error({ err }, 'Memory agent background error')
  );

  return {
    response: parsed.response,
    actions: executedActions,
  };
}
