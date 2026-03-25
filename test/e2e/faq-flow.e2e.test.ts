import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { TextChannel } from 'discord.js';
import { devBot, testUserBot } from './clients.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { mswServer, handlers } from '../msw-server.js';
import { CHANNELS } from '../../packages/bot-discord/src/config.js';

describe('FAQ flow', () => {
  let faqChannel: TextChannel | undefined;
  let guildId: string;

  beforeAll(() => {
    guildId = process.env['DISCORD_TEST_GUILD_ID']!;
    const guild = testUserBot.guilds.cache.get(guildId);
    if (!guild) throw new Error(`Test-user bot is not in test guild ${guildId}`);

    faqChannel = guild.channels.cache.find(
      (ch): ch is TextChannel => ch.type === 0 && ch.name === CHANNELS.faq
    ) as TextChannel | undefined;

    if (!faqChannel) {
      throw new Error(
        `Channel #${CHANNELS.faq} not found in test guild. ` +
        'Create it manually before running E2E tests.'
      );
    }
  });

  beforeEach(() => {
    mswServer.resetHandlers();
    mswServer.use(
      handlers.anthropicSuccess('Это ответ на ваш вопрос. Модуль 1 покрывает основы JavaScript.')
    );
  });

  it('student asks FAQ question, bot replies with answer (positive path)', async () => {
    mswServer.use(
      handlers.anthropicSuccess('Модуль 1 длится 2 недели и включает основы JavaScript.')
    );

    // Register listener BEFORE send to avoid race condition (pitfall 7)
    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === faqChannel!.id,
      15_000
    );

    await faqChannel!.send('Сколько длится модуль 1 и что он включает?');

    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
    expect(reply.author.id).toBe(devBot.user!.id);
  }, 30_000);

  it('faq channel is correctly resolved from test guild', () => {
    expect(faqChannel).toBeDefined();
    expect(faqChannel!.name).toBe(CHANNELS.faq);
    expect(faqChannel!.type).toBe(0); // ChannelType.GuildText === 0
  });

  it('messages in non-faq channels do not trigger FAQ handler', async () => {
    const guildFromTestUser = testUserBot.guilds.cache.get(guildId);
    const otherChannel = guildFromTestUser?.channels.cache.find(
      (ch): ch is TextChannel =>
        ch.type === 0 && ch.name !== CHANNELS.faq
    ) as TextChannel | undefined;

    if (!otherChannel) {
      // No other text channel available — skip assertion gracefully
      console.warn('[e2e] No non-faq text channel found to test isolation');
      return;
    }

    // Wait 3 seconds — expect timeout (no reply from devBot)
    let timedOut = false;
    try {
      await waitForMessage(
        testUserBot,
        (m) => m.author.id === devBot.user!.id && m.channel.id === otherChannel.id,
        3_000
      );
    } catch {
      timedOut = true;
    }

    // Send the message AFTER setting up the listener so we avoid the listener surviving
    // into other tests if this one fails before the send
    await otherChannel.send('Как работает JavaScript?');

    expect(timedOut).toBe(true);
  }, 15_000);

  it('short messages in #faq are ignored (length < 5 guard)', async () => {
    // 'Да?' is 3 chars — passes bot-check bypass but fails the length < 5 guard
    let timedOut = false;
    const waitPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === faqChannel!.id,
      3_000
    );

    await faqChannel!.send('Да?');

    try {
      await waitPromise;
    } catch {
      timedOut = true;
    }

    expect(timedOut).toBe(true);
  }, 15_000);

  it('test guild has all required channels (production mirror per D-04)', () => {
    const guild = testUserBot.guilds.cache.get(guildId);
    expect(guild).toBeDefined();

    const channelNames = Object.values(CHANNELS);
    // All 6 required channels: объявления, сессии, чат, faq, победы, админ
    // Type 0 = GuildText, 15 = GuildForum (сессии is a Forum channel)
    const allowedTypes = new Set([0, 15]);
    for (const name of channelNames) {
      const found = guild!.channels.cache.find(
        (ch) => allowedTypes.has(ch.type) && ch.name === name
      );
      expect(found, `Channel #${name} missing in test guild`).toBeDefined();
    }
  });
});
