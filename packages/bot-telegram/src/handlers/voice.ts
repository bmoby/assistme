import type { Bot, Context } from 'grammy';
import {
  transcribeAudio,
  askClaude,
  getActiveTasks,
  getClientPipeline,
  createTask,
  completeTask,
  createClient,
  logger,
} from '@vibe-coder/core';
import { isAdmin } from '../utils/auth.js';

const ORGANIZER_SYSTEM_PROMPT = `Tu es le copilote personnel de Magomed. Il vient de t'envoyer un message vocal transcrit.

TON ROLE :
- Comprendre ce qu'il dit et AGIR automatiquement
- Creer des taches, des clients, des rappels selon ce qu'il raconte
- Organiser les informations sans qu'il ait a faire quoi que ce soit
- Repondre de maniere concise et claire
- Toujours confirmer ce que tu as fait

CONTEXTE ACTUEL :
{context}

REGLES :
- Si il parle d'un client ou d'une demande → cree un client
- Si il parle d'une chose a faire → cree une tache avec la bonne priorite
- Si il parle d'un etudiant → note l'info
- Si il donne des nouvelles generales → resume et stocke
- Si il dit qu'il a fait quelque chose → marque comme fait
- Tu peux faire PLUSIEURS actions en une seule reponse
- Reponds toujours en francais

FORMAT DE REPONSE (JSON strict) :
{
  "actions": [
    {
      "type": "create_task" | "complete_task" | "create_client" | "create_reminder" | "note",
      "data": { ... }
    }
  ],
  "response": "Message a envoyer a Magomed (concis, confirme les actions)"
}

Pour create_task : data = { "title", "category", "priority", "due_date" (YYYY-MM-DD ou null), "estimated_minutes" }
Pour complete_task : data = { "task_title_match" }
Pour create_client : data = { "name", "need", "budget_range", "source" }
Pour create_reminder : data = { "message", "delay_hours" }
Pour note : data = { "content" } (info a retenir sans action specifique)`;

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

      // Process with Claude
      await processMessage(ctx, text);

    } catch (error) {
      logger.error({ error }, 'Failed to process voice message');
      await ctx.reply('Erreur lors du traitement du vocal. Essaie en texte ou renvoie le vocal.');
    }
  });
}

export async function processMessage(ctx: Context, text: string): Promise<void> {
  const activeTasks = await getActiveTasks();
  const clients = await getClientPipeline();

  const context = `
Taches actives (${activeTasks.length}) :
${activeTasks.map((t) => `- [${t.priority}] ${t.title} (${t.category})`).join('\n') || 'Aucune'}

Clients (${clients.length}) :
${clients.map((c) => `- ${c.name} [${c.status}] ${c.need ?? ''}`).join('\n') || 'Aucun'}

Date : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Heure : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  const prompt = ORGANIZER_SYSTEM_PROMPT.replace('{context}', context);

  const response = await askClaude({
    prompt: text,
    systemPrompt: prompt,
    model: 'sonnet',
  });

  // Clean and parse response (Claude sometimes wraps JSON in ```json...```)
  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: { actions: Array<{ type: string; data: Record<string, string> }>; response: string };
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    // If Claude didn't return valid JSON, just send the raw response as text
    // Strip any remaining JSON artifacts
    const cleanResponse = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    await ctx.reply(cleanResponse);
    return;
  }

  // Execute actions
  for (const action of parsed.actions) {
    try {
      switch (action.type) {
        case 'create_task': {
          await createTask({
            title: action.data['title'] ?? 'Tache sans titre',
            category: (action.data['category'] as 'personal') ?? 'personal',
            priority: (action.data['priority'] as 'normal') ?? 'normal',
            due_date: action.data['due_date'] ?? null,
            estimated_minutes: action.data['estimated_minutes']
              ? parseInt(action.data['estimated_minutes'], 10)
              : null,
            source: 'voice',
            status: 'todo',
          });
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
            }
          }
          break;
        }
        case 'create_client': {
          await createClient({
            name: action.data['name'] ?? 'Inconnu',
            need: action.data['need'] ?? null,
            budget_range: action.data['budget_range'] ?? null,
            source: action.data['source'] ?? 'voice',
            status: 'lead',
          });
          break;
        }
        case 'note':
        case 'create_reminder':
          // TODO: implement reminders and notes table
          break;
      }
    } catch (error) {
      logger.error({ error, action }, 'Failed to execute action');
    }
  }

  // Send response
  await ctx.reply(parsed.response);
}
