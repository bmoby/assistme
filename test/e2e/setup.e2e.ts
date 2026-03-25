import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { beforeAll, afterAll } from 'vitest';
import { loadE2eEnv } from './helpers/env.js';
import { setDevBot, setTestUserBot } from './clients.js';
import { setupDmHandler } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { setupFaqHandler } from '../../packages/bot-discord/src/handlers/faq.js';
import { setupAdminHandler } from '../../packages/bot-discord/src/handlers/admin-handler.js';
import { mswServer, handlers } from '../msw-server.js';
import { ROLES } from '../../packages/bot-discord/src/config.js';

function waitForReady(client: Client, label: string, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client.isReady()) {
      resolve();
      return;
    }
    const timer = setTimeout(
      () => reject(new Error(`${label} did not become ready within ${timeoutMs}ms`)),
      timeoutMs
    );
    client.once('ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

let devBot: Client;
let testUserBot: Client;

beforeAll(async () => {
  const env = loadE2eEnv();

  // Start MSW — mock Claude API by default
  mswServer.listen({ onUnhandledRequest: 'bypass' });
  if (!process.env['E2E_LIVE']) {
    mswServer.use(handlers.anthropicSuccess('Тест-ответ от мок-агента. Ваш запрос обработан.'));
  }

  // Dev bot — full production intents
  devBot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  // Wire handlers (NOT main() — avoids registerSlashCommands REST call)
  setupDmHandler(devBot);
  setupFaqHandler(devBot);
  setupAdminHandler(devBot);

  await devBot.login(env.DISCORD_DEV_BOT_TOKEN);
  await waitForReady(devBot, 'devBot');
  setDevBot(devBot);

  // Test-user bot — minimal intents + DM support
  testUserBot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  await testUserBot.login(env.DISCORD_TEST_USER_BOT_TOKEN);
  await waitForReady(testUserBot, 'testUserBot');
  setTestUserBot(testUserBot);

  // Fetch guild data explicitly (cache may not be populated yet)
  const guild = await devBot.guilds.fetch(env.DISCORD_TEST_GUILD_ID);
  if (!guild) throw new Error(`Dev bot is not in test guild ${env.DISCORD_TEST_GUILD_ID}`);
  await guild.channels.fetch();
  const member = await guild.members.fetch(testUserBot.user!.id);
  const hasStudentRole = member.roles.cache.some((r) => r.name === ROLES.student);
  if (!hasStudentRole) {
    throw new Error(
      `Test-user bot missing @${ROLES.student} role in test guild. ` +
      'Assign manually: Server Settings -> Members -> Test User Bot -> Add Role -> student'
    );
  }

  console.log(`[e2e] Both bots connected. Dev: ${devBot.user?.tag}, Test user: ${testUserBot.user?.tag}`);
}, 60_000);

afterAll(async () => {
  mswServer.close();
  await devBot?.destroy();
  await testUserBot?.destroy();
  console.log('[e2e] Bots disconnected, MSW closed.');
});
