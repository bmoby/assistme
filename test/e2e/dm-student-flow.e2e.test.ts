import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TextChannel } from 'discord.js';
import { devBot, testUserBot } from './clients.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { emitFakeDm } from './helpers/fake-dm.js';
import { seedTestStudent, cleanupTestStudent } from './helpers/seed-e2e.js';
import { _clearStateForTesting } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { mswServer, handlers } from '../msw-server.js';
import { CHANNELS } from '../../packages/bot-discord/src/config.js';

describe('DM student flow', () => {
  let runId: string;
  let replyChannel: TextChannel;

  beforeAll(async () => {
    const result = await seedTestStudent(testUserBot.user!.id);
    runId = result.runId;

    // Use a guild channel for replies (bots can't DM each other)
    const guild = devBot.guilds.cache.first()!;
    const channel = guild.channels.cache.find(
      (ch) => ch.type === 0 && ch.name === CHANNELS.chat
    );
    if (!channel) throw new Error(`Channel #${CHANNELS.chat} not found in test guild`);
    replyChannel = channel as TextChannel;
  }, 30_000);

  afterAll(async () => {
    await cleanupTestStudent(runId);
  }, 30_000);

  beforeEach(() => {
    _clearStateForTesting();
    mswServer.resetHandlers();
    mswServer.use(handlers.anthropicSuccess('Тест-ответ от мок-агента. Ваш запрос обработан.'));
  });

  it('student sends text message, bot replies via DM Agent', async () => {
    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Привет, какой мой прогресс?',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
    expect(reply.author.bot).toBe(true);
    expect(reply.author.id).toBe(devBot.user!.id);
  }, 30_000);

  it('bot replies with mock agent response content', async () => {
    mswServer.use(handlers.anthropicSuccess('Ваш прогресс: Модуль 1 завершён на 50%.'));

    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Расскажи о моём прогрессе в обучении',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const reply = await replyPromise;

    expect(reply.content).toContain('прогресс');
  }, 30_000);

  it('consecutive messages maintain conversation context', async () => {
    // First message
    const firstReplyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Какой модуль сейчас?',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const firstReply = await firstReplyPromise;
    expect(firstReply.content.length).toBeGreaterThan(0);

    // Second message — no _clearStateForTesting() between sends (testing multi-turn)
    const secondReplyPromise = waitForMessage(
      devBot,
      (m) =>
        m.author.id === devBot.user!.id &&
        m.channel.id === replyChannel.id &&
        m.id !== firstReply.id,
      15_000
    );

    emitFakeDm({
      content: 'А какие задания?',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const secondReply = await secondReplyPromise;
    expect(secondReply.content.length).toBeGreaterThan(0);
  }, 60_000);

  it('bot handles message with URL in content', async () => {
    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Вот моя работа: https://docs.google.com/document/d/test123',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const reply = await replyPromise;
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('bot responds even with very short message', async () => {
    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Привет',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const reply = await replyPromise;
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);
});
