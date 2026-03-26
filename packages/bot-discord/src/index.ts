import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

// Load .env.dev first (overrides), then .env (defaults)
// dotenv does NOT overwrite existing vars, so first-loaded wins
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');
dotenv.config({ path: resolve(root, '.env.dev') });
dotenv.config({ path: resolve(root, '.env') });

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { logger, agents } from '@assistme/core';
import { registerSlashCommands, setupCommandHandler } from './commands/index.js';
import { setupFaqHandler } from './handlers/faq.js';
import { setupGuildMemberHandler } from './handlers/guild-member.js';
import { setupDmHandler } from './handlers/dm-handler.js';
import { setupAdminHandler } from './handlers/admin-handler.js';
import { registerCronJobs } from './cron/index.js';
import { registerReviewButtons } from './handlers/review-buttons.js';

async function main(): Promise<void> {
  const token = process.env['DISCORD_BOT_TOKEN'];
  const guildId = process.env['DISCORD_GUILD_ID'];
  const clientId = process.env['DISCORD_CLIENT_ID'];

  if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
  if (!guildId) throw new Error('DISCORD_GUILD_ID not set');
  if (!clientId) throw new Error('DISCORD_CLIENT_ID not set');

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  // Register autonomous agents
  agents.registerArtisan();
  agents.registerChercheur();

  // Register slash commands via REST API (guild-level for instant updates)
  try {
    await registerSlashCommands(token, clientId, guildId);
  } catch (err) {
    logger.warn({ err }, 'Slash commands registration failed — bot continues without them');
  }

  // Register button handlers
  registerReviewButtons();

  // Setup handlers
  setupCommandHandler(client);
  setupFaqHandler(client);
  setupGuildMemberHandler(client);
  setupDmHandler(client);
  setupAdminHandler(client);

  // Client ready event
  client.once('ready', (readyClient) => {
    logger.info(
      { user: readyClient.user.tag, guildId },
      'Bot Discord Formateur is online'
    );

    // Register cron jobs after client is ready
    registerCronJobs(client, guildId);
  });

  // Global error handler
  client.on('error', (error) => {
    logger.error({ error }, 'Discord client error');
  });

  // Login
  await client.login(token);
}

main().catch((error) => {
  logger.error({ err: error, message: error?.message, code: error?.code }, 'Failed to start Discord bot');
  console.error(error);
  process.exit(1);
});
