import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TextChannel } from 'discord.js';
import { devBot, testUserBot } from './clients.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { emitFakeDm } from './helpers/fake-dm.js';
import { seedTestStudent, cleanupTestStudent } from './helpers/seed-e2e.js';
import { _clearStateForTesting } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { mswServer, handlers } from '../msw-server.js';
import { CHANNELS } from '../../packages/bot-discord/src/config.js';

describe('Exercise submission', () => {
  let runId: string;
  let replyChannel: TextChannel;

  beforeAll(async () => {
    const result = await seedTestStudent(testUserBot.user!.id);
    runId = result.runId;

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

  it('student sends file attachment, bot processes it', async () => {
    mswServer.use(handlers.anthropicSuccess('Файл получен и обработан. Спасибо за работу!'));

    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Вот моё задание по модулю 1',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
      attachments: [{
        id: 'att-1',
        name: 'homework.pdf',
        url: 'https://cdn.discordapp.com/attachments/fake/homework.pdf',
        contentType: 'application/pdf',
        size: 1024,
      }],
    });

    const reply = await replyPromise;
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('student sends image attachment', async () => {
    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Скриншот задания',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
      attachments: [{
        id: 'att-2',
        name: 'screenshot.png',
        url: 'https://cdn.discordapp.com/attachments/fake/screenshot.png',
        contentType: 'image/png',
        size: 2048,
      }],
    });

    const reply = await replyPromise;
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('student sends text with link (URL extraction)', async () => {
    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Задание в Google Docs: https://docs.google.com/document/d/abc123/edit',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const reply = await replyPromise;
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('student sends message without attachment (text-only submission context)', async () => {
    const replyPromise = waitForMessage(
      devBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === replyChannel.id,
      15_000
    );

    emitFakeDm({
      content: 'Я закончил модуль 2, могу ли я получить обратную связь?',
      authorId: testUserBot.user!.id,
      devBot,
      replyChannel,
    });

    const reply = await replyPromise;
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);
});
