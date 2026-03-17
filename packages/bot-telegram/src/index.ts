// Deployed via GitHub Actions CI/CD
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env BEFORE any other imports that read env vars
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const { Bot } = await import('grammy');
  const { logger } = await import('@assistme/core');
  const { registerCommands } = await import('./commands/index.js');
  const { registerVoiceHandler } = await import('./handlers/voice.js');
  const { registerFreeText } = await import('./handlers/free-text.js');
  const { registerCronJobs } = await import('./cron/index.js');

  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
  }

  const bot = new Bot(token);

  // Register command handlers (backup, still available)
  registerCommands(bot);

  // Register voice message handler
  registerVoiceHandler(bot);

  // Register free text handler (must be last)
  registerFreeText(bot);

  // Start cron jobs (proactive check-ins)
  registerCronJobs(bot);

  // Error handling
  bot.catch((err) => {
    logger.error({ error: err.error, ctx: err.ctx?.update }, 'Bot error');
  });

  // Start the bot
  logger.info('Starting Telegram Copilot bot...');
  bot.start({
    onStart: () => {
      logger.info('Telegram Copilot bot is running');
    },
  });
}

main().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
