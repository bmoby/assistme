// Deployed via GitHub Actions CI/CD
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env BEFORE any other imports that read env vars
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function main() {
  const { Bot } = await import('grammy');
  const { logger, agents } = await import('@assistme/core');
  const { registerCommands } = await import('./commands/index.js');
  const { registerVoiceHandler } = await import('./handlers/voice.js');
  const { registerFreeText } = await import('./handlers/free-text.js');
  const { registerCronJobs } = await import('./cron/index.js');

  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
  }

  const bot = new Bot(token);

  // Register autonomous agents
  agents.registerArtisan();
  agents.registerChercheur();

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

  // Register command menu in Telegram UI
  await bot.api.setMyCommands([
    { command: 'plan', description: 'Plan du jour (AI)' },
    { command: 'tasks', description: 'Toutes les taches actives' },
    { command: 'next', description: 'Prochaine tache a faire' },
    { command: 'done', description: 'Marquer la tache comme faite' },
    { command: 'add', description: 'Ajouter une tache rapide' },
    { command: 'skip', description: 'Passer la tache en cours' },
    { command: 'clients', description: 'Pipeline clients' },
    { command: 'newclient', description: 'Creer un nouveau lead' },
    { command: 'notifs', description: 'Voir/regler les notifications' },
    { command: 'replan', description: 'Replanifier les notifications' },
    { command: 'voice', description: 'Activer/desactiver reponses vocales' },
  ]);
  logger.info('Bot commands menu registered');

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
