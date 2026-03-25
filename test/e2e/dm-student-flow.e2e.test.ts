import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { devBot, testUserBot } from './clients.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { seedTestStudent, cleanupTestStudent } from './helpers/seed-e2e.js';
import { _clearStateForTesting } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { mswServer, handlers } from '../msw-server.js';

describe('DM student flow', () => {
  let runId: string;

  beforeAll(async () => {
    const result = await seedTestStudent(testUserBot.user!.id);
    runId = result.runId;
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
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    // Register listener BEFORE send to avoid race condition (pitfall 7)
    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send('Привет, какой мой прогресс?');

    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
    expect(reply.author.bot).toBe(true);
    expect(reply.author.id).toBe(devBot.user!.id);
  }, 30_000);

  it('bot replies with mock agent response content', async () => {
    mswServer.use(handlers.anthropicSuccess('Ваш прогресс: Модуль 1 завершён на 50%.'));

    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send('Расскажи о моём прогрессе в обучении');

    const reply = await replyPromise;

    expect(reply.content).toContain('прогресс');
  }, 30_000);

  it('consecutive messages maintain conversation context', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    // First message
    const firstReplyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );
    await dmChannel.send('Какой модуль сейчас?');
    const firstReply = await firstReplyPromise;
    expect(firstReply.content.length).toBeGreaterThan(0);

    // Second message — no _clearStateForTesting() between sends (testing multi-turn)
    const secondReplyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );
    await dmChannel.send('А какие задания?');
    const secondReply = await secondReplyPromise;
    expect(secondReply.content.length).toBeGreaterThan(0);
  }, 60_000);

  it('bot handles message with URL in content', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send('Вот моя работа: https://docs.google.com/document/d/test123');

    const reply = await replyPromise;

    // Handler extracts URLs as pending attachments and still processes message
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('bot responds even with very short message', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send('Привет');

    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);
});
