import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env BEFORE any other imports that read env vars
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const { Bot } = await import('grammy');
  const { logger } = await import('@assistme/core');
  const { registerMessageHandler } = await import('./handlers/message.js');
  const { registerVoiceHandler } = await import('./handlers/voice.js');

  const token = process.env['PUBLIC_BOT_TOKEN'];
  if (!token) {
    throw new Error('Missing PUBLIC_BOT_TOKEN environment variable');
  }

  const bot = new Bot(token);

  // /start command
  bot.command('start', async (ctx) => {
    const name = ctx.from?.first_name ?? '';
    await ctx.reply(
      `Привет${name ? `, ${name}` : ''}! 👋\n\n` +
      `Я бот-помощник Магомеда. Могу рассказать:\n\n` +
      `📚 О курсе Pilote Neuro (обучение разработке с помощью ИИ)\n` +
      `💼 О наших услугах (сайты, боты, автоматизация)\n` +
      `🎓 О бесплатных курсах для начинающих\n\n` +
      `Напиши или отправь голосовое сообщение — я помогу! 🚀`
    );
  });

  // Register voice handler (before text so voice is caught first)
  registerVoiceHandler(bot);

  // Register message handler (must be after commands)
  registerMessageHandler(bot);

  // Error handling
  bot.catch((err) => {
    logger.error({ error: err.error, ctx: err.ctx?.update }, 'Public bot error');
  });

  // Start the bot
  logger.info('Starting Public Telegram bot (Russian)...');
  bot.start({
    onStart: () => {
      logger.info('Public Telegram bot is running');
    },
  });
}

main().catch((err) => {
  console.error('Failed to start public bot:', err);
  process.exit(1);
});
