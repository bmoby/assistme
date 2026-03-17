import type { Bot, Context } from 'grammy';
import {
  transcribeAudio,
  askClaude,
  getAllPublicKnowledge,
  createClient,
  logger,
} from '@assistme/core';
import type { PublicKnowledge } from '@assistme/core';
import { addMessage, formatHistoryForPrompt } from '../utils/conversation.js';
import { notifyAdmin } from '../utils/notify-admin.js';

function buildKnowledgeBase(entries: PublicKnowledge[]): string {
  const grouped: Record<string, PublicKnowledge[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category]!.push(entry);
  }

  let result = '';
  const labels: Record<string, string> = {
    formation: 'FORMATION PILOTE NEURO',
    services: 'SERVICES / AGENCE',
    faq: 'QUESTIONS FREQUENTES',
    free_courses: 'COURS GRATUITS',
    general: 'INFORMATIONS GENERALES',
  };

  for (const [category, items] of Object.entries(grouped)) {
    result += `\n[${labels[category] ?? category.toUpperCase()}]\n`;
    for (const item of items) {
      result += `- ${item.key}: ${item.content}\n`;
    }
  }
  return result;
}

const SYSTEM_PROMPT = `Ты — бот-помощник Магомеда. Ты общаешься ТОЛЬКО НА РУССКОМ ЯЗЫКЕ.

ТВОЯ БАЗА ЗНАНИЙ (информация написана на французском, но ты переводишь и отвечаешь на русском):
{knowledge}

ССЫЛКИ:
- Сайт курса: {pilote_neuro_url}
- Бесплатные курсы Portal: {portal_url}
- Телеграм группа: {telegram_group_url}

ИСТОРИЯ РАЗГОВОРА:
{history}

ПРАВИЛА:
- Отвечай ТОЛЬКО на русском языке
- Будь дружелюбным, профессиональным и прямым
- Используй информацию из базы знаний для ответов
- Если человек спрашивает про курсы — расскажи про Pilote Neuro и дай ссылку на сайт
- Если спрашивает "с чего начать" или "что нужно знать" — направь на бесплатные курсы Portal
- Если у человека есть проект/бизнес-задача — это ПОТЕНЦИАЛЬНЫЙ КЛИЕНТ:
  1. Узнай подробнее о его бизнесе
  2. Узнай что конкретно ему нужно
  3. Узнай примерный бюджет
  4. Когда собрал достаточно информации — ответь специальным тегом
- Если не знаешь ответ — скажи честно и предложи задать вопрос в Telegram группе
- Будь краток (3-5 предложений максимум, если не нужно больше)
- Не придумывай информацию, которой нет в базе знаний
- Используй эмодзи умеренно для читабельности

ОПРЕДЕЛЕНИЕ КЛИЕНТА:
Если в разговоре ты собрал достаточно информации о потенциальном клиенте (имя, что нужно, бюджет), добавь в конце ответа ОТДЕЛЬНОЙ СТРОКОЙ:
[LEAD: name="Имя" need="Что нужно" budget="Бюджет" business="Тип бизнеса"]
Этот тег НЕ будет показан пользователю. Добавляй его только когда у тебя есть минимум имя и потребность.`;

const LEAD_REGEX = /\[LEAD:\s*name="([^"]*?)"\s*need="([^"]*?)"\s*budget="([^"]*?)"\s*business="([^"]*?)"\s*\]/;

export function registerVoiceHandler(bot: Bot): void {
  bot.on('message:voice', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      await ctx.reply('🎙️ Слушаю...');

      // Download voice file
      const voice = ctx.message?.voice;
      if (!voice) return;

      const file = await ctx.api.getFile(voice.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env['PUBLIC_BOT_TOKEN']}/${file.file_path}`;

      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Transcribe in Russian
      const text = await transcribeAudio(buffer, 'voice.ogg', 'ru');

      if (!text || text.trim().length === 0) {
        await ctx.reply('Не удалось распознать сообщение. Попробуйте ещё раз?');
        return;
      }

      // Show transcription
      await ctx.reply(`📝 "${text}"`);

      // Load knowledge base
      const knowledge = await getAllPublicKnowledge();
      const knowledgeText = buildKnowledgeBase(knowledge);

      // Build conversation history
      addMessage(chatId, 'user', text);
      const history = formatHistoryForPrompt(chatId);

      // Build system prompt
      const systemPrompt = SYSTEM_PROMPT
        .replace('{knowledge}', knowledgeText)
        .replace('{pilote_neuro_url}', process.env['PILOTE_NEURO_URL'] ?? '[ссылка будет добавлена]')
        .replace('{portal_url}', process.env['PORTAL_URL'] ?? '[ссылка будет добавлена]')
        .replace('{telegram_group_url}', process.env['TELEGRAM_GROUP_URL'] ?? '[ссылка будет добавлена]')
        .replace('{history}', history || '(новый разговор)');

      // Call Claude
      const aiResponse = await askClaude({
        prompt: text,
        systemPrompt,
        model: 'sonnet',
        maxTokens: 1024,
      });

      // Check for lead tag
      const leadMatch = aiResponse.match(LEAD_REGEX);
      let cleanResponse = aiResponse;

      if (leadMatch) {
        cleanResponse = aiResponse.replace(LEAD_REGEX, '').trim();

        const [, name, need, budget, business] = leadMatch;

        try {
          const client = await createClient({
            name: name ?? 'Inconnu',
            need: need ?? null,
            budget_range: budget ?? null,
            business_type: business ?? null,
            source: 'telegram_public_bot_voice',
            status: 'lead',
            notes: `Chat ID: ${chatId} (vocal)`,
          });

          const senderName = ctx.message?.from?.first_name ?? 'Inconnu';
          await notifyAdmin(
            `🔔 <b>Nouveau lead depuis le bot public (vocal)</b>\n\n` +
            `👤 <b>${senderName}</b> (${name})\n` +
            `💼 Business: ${business}\n` +
            `📋 Besoin: ${need}\n` +
            `💰 Budget: ${budget}\n\n` +
            `ID client: ${client.id}`
          );

          logger.info({ clientId: client.id, name }, 'New lead captured from public bot (voice)');
        } catch (error) {
          logger.error({ error }, 'Failed to save lead from public bot voice');
        }
      }

      addMessage(chatId, 'assistant', cleanResponse);
      await ctx.reply(cleanResponse);

    } catch (error) {
      logger.error({ error, chatId }, 'Failed to process public bot voice message');
      await ctx.reply('Извините, произошла ошибка при обработке голосового сообщения. Попробуйте текстом.');
    }
  });
}
