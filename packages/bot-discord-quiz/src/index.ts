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
import { logger } from '@assistme/core';
import { registerCronJobs } from './cron/index.js';
import { setupHandlers } from './handlers/index.js';

async function main(): Promise<void> {
  const token = process.env['DISCORD_QUIZ_BOT_TOKEN'];
  const guildId = process.env['DISCORD_GUILD_ID'];
  const clientId = process.env['DISCORD_QUIZ_CLIENT_ID'];

  if (!token) throw new Error('DISCORD_QUIZ_BOT_TOKEN not set');
  if (!guildId) throw new Error('DISCORD_GUILD_ID not set');
  if (!clientId) throw new Error('DISCORD_QUIZ_CLIENT_ID not set');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  client.once('ready', (readyClient) => {
    logger.info(
      { user: readyClient.user.tag, guildId },
      'TeacherBot is online'
    );
    registerCronJobs(client, guildId);
    setupHandlers(client);
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Discord quiz client error');
  });

  await client.login(token);
}

main().catch((error) => {
  logger.error({ err: error, message: error?.message, code: error?.code }, 'Failed to start TeacherBot');
  console.error(error);
  process.exit(1);
});
