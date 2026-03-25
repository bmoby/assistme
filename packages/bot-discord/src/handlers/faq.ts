import { Client, Message, TextChannel } from 'discord.js';
import { getAllFaqEntries, answerFaqQuestion, incrementFaqUsage, createFaqEntry, createFormationEvent } from '@assistme/core';
import { logger } from '@assistme/core';
import { isAdmin, isStudent, isMentor } from '../utils/auth.js';
import { splitMessage } from '../utils/message-split.js';
import { CHANNELS } from '../config.js';

export function setupFaqHandler(client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    // Ignore bots (bypass in test mode so E2E tests can exercise the full path)
    if (message.author.bot && process.env['NODE_ENV'] !== 'test') return;

    // Only in FAQ channel
    if (!(message.channel instanceof TextChannel)) return;
    if (message.channel.name !== CHANNELS.faq) return;

    // Must be a student, admin, or mentor
    if (!isStudent(message) && !isAdmin(message) && !isMentor(message)) return;

    // If admin or mentor is answering, add to FAQ base
    if ((isAdmin(message) || isMentor(message)) && message.reference) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId!);
        if (repliedTo && !repliedTo.author.bot) {
          // Deduplicate: check if a similar FAQ already exists
          const existingFaq = await getAllFaqEntries();
          const questionLower = repliedTo.content.toLowerCase();
          const isDuplicate = existingFaq.some((f) => {
            const existingLower = f.question.toLowerCase();
            return existingLower.includes(questionLower.slice(0, 50))
              || questionLower.includes(existingLower.slice(0, 50));
          });

          if (!isDuplicate) {
            await createFaqEntry({
              question: repliedTo.content,
              answer: message.content,
              category: 'general',
              created_by: isAdmin(message) ? 'formateur' : 'mentor',
            });
            await message.react('\ud83d\udcdd');
          } else {
            await message.react('\u2705');
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Could not auto-add FAQ from admin reply');
      }
      return;
    }

    // Student asking a question
    const question = message.content.trim();
    if (question.length < 5) return;

    try {
      const faqEntries = await getAllFaqEntries();
      const response = await answerFaqQuestion({
        question,
        existingFaq: faqEntries,
      });

      if (response.confidence >= 70) {
        const chunks = splitMessage(response.answer);
        for (const chunk of chunks) {
          await message.reply(chunk);
        }

        // Track usage
        if (response.matchedFaqId) {
          await incrementFaqUsage(response.matchedFaqId);
        }

        // Suggest adding to FAQ if needed
        if (response.suggestAddToFaq) {
          await createFaqEntry({
            question,
            answer: response.answer,
            category: 'auto',
            created_by: 'faq-agent',
          });
        }
      } else {
        await message.reply(
          `Я не уверен в ответе. Тренер ответит тебе лично.`
        );

        // Alert admin
        await createFormationEvent({
          type: 'student_alert',
          source: 'discord',
          target: 'telegram-admin',
          data: {
            alert_type: 'faq_unanswered',
            student_name: message.author.displayName,
            question,
          },
        });
      }
    } catch (error) {
      logger.error({ error, question }, 'FAQ handler error');
      await message.reply('Техническая ошибка. Тренер уведомлён.');
    }
  });
}
