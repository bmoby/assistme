import type { Bot } from 'grammy';
import { InputFile } from 'grammy';
import { getUnprocessedEvents, markEventProcessed, agents } from '@assistme/core';
import { logger } from '@assistme/core';

export async function processFormationEvents(bot: Bot, chatId: string): Promise<void> {
  try {
    const events = await getUnprocessedEvents('telegram-admin');

    if (events.length === 0) return;

    for (const event of events) {
      try {
        const data = event.data as Record<string, unknown>;

        switch (event.type) {
          case 'exercise_submitted': {
            const msg =
              `📩 **Exercice soumis**\n` +
              `Etudiant : ${data.student_name}\n` +
              `Module ${data.module}, Exercice ${data.exercise_number}\n` +
              `Score IA : ${data.ai_score ?? '?'}/10\n` +
              `Recommandation : ${data.ai_recommendation ?? '?'}\n` +
              `Lien : ${data.submission_url}`;
            await bot.api.sendMessage(chatId, msg);
            break;
          }

          case 'exercise_reviewed': {
            const msg =
              `✅ **Exercice reviewe**\n` +
              `Etudiant : ${data.student_name}\n` +
              `M${data.module}-E${data.exercise_number} → ${data.status}`;
            await bot.api.sendMessage(chatId, msg);
            break;
          }

          case 'daily_exercise_digest': {
            const pending = (data.pending_details as Array<Record<string, unknown>>) ?? [];
            let msg =
              `📊 **Digest exercices du jour**\n` +
              `Total : ${data.total} | En attente : ${data.pending}\n` +
              `Approuves : ${data.approved} | A revoir : ${data.revision_needed}`;

            if (pending.length > 0) {
              msg += '\n\nEn attente :';
              for (const ex of pending.slice(0, 10)) {
                msg += `\n- M${ex.module}-E${ex.exercise_number} (${ex.status})`;
              }
              if (pending.length > 10) msg += `\n... et ${pending.length - 10} autres`;
            }

            await bot.api.sendMessage(chatId, msg);
            break;
          }

          case 'student_alert': {
            const alertType = data.alert_type as string;
            let msg = `⚠️ **Alerte etudiant** : ${data.student_name}\n`;

            if (alertType === 'dropout_risk') {
              msg += `Risque de decrochage !\n`;
              msg += `Inactif depuis ${data.days_inactive} jours\n`;
              msg += `Exercices soumis : ${data.total_exercises}\n`;
              msg += `Dernier exercice : ${data.last_submission}`;
            } else if (alertType === 'faq_unanswered') {
              msg += `Question FAQ sans reponse :\n"${data.question}"`;
            } else {
              msg += `Type : ${alertType}\n${JSON.stringify(data, null, 2)}`;
            }

            await bot.api.sendMessage(chatId, msg);
            break;
          }

          case 'agent_job_completed': {
            const targetChatId = String(data.chat_id ?? chatId);
            const resultFiles = (data.result_files as Array<{ storage_path: string; filename: string; mime_type: string }>) ?? [];
            const resultText = data.result_text as string | null;

            if (resultText) {
              await bot.api.sendMessage(targetChatId, resultText);
            }

            for (const file of resultFiles) {
              try {
                const buffer = await agents.downloadFromStorage(file.storage_path);
                await bot.api.sendDocument(targetChatId, new InputFile(buffer, file.filename), {
                  caption: `${data.agent_name ?? 'Agent'} — ${file.filename}`,
                });
              } catch (err) {
                logger.error({ err, storagePath: file.storage_path }, 'Failed to send agent output file');
                await bot.api.sendMessage(targetChatId, `Erreur: impossible d'envoyer ${file.filename}`);
              }
            }
            break;
          }

          default:
            logger.info({ type: event.type }, 'Unknown formation event type');
        }

        await markEventProcessed(event.id);
      } catch (err) {
        logger.error({ err, eventId: event.id, type: event.type }, 'Failed to process formation event');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Formation events processor failed');
  }
}
