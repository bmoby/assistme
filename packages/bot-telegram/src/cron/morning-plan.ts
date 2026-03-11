import type { Bot } from 'grammy';
import {
  askClaude,
  buildContext,
  logger,
} from '@vibe-coder/core';

const MORNING_PROMPT = `Tu es le copilote de Magomed. C'est le matin (8h30).

{context}

Genere son plan du jour. Regles :
- Max 3 taches urgentes, 2-3 importantes, 2 optionnelles
- Commence toujours par une tache rapide (<15 min) pour lancer la dynamique
- Taches lourdes entre 10h-15h (fenetre d'or)
- Apres 15h : taches legeres
- Si pas de sport depuis longtemps, inclure une session
- Termine par un message motivant et direct
- Demande si il a des nouvelles a ajouter

Reponds directement en texte formate (pas de JSON). Utilise des emojis pour la lisibilite.`;

export async function morningPlan(bot: Bot, chatId: string): Promise<void> {
  try {
    const context = await buildContext();
    const prompt = MORNING_PROMPT.replace('{context}', context);

    const plan = await askClaude({
      prompt: 'Genere le plan du jour.',
      systemPrompt: prompt,
      model: 'sonnet',
    });

    await bot.api.sendMessage(chatId, plan);
    logger.info('Morning plan sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send morning plan');
  }
}
