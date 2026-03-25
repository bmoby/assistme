import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { devBot, testUserBot } from './clients.js';
import { waitForMessage } from './helpers/wait-for-message.js';
import { seedTestStudent, cleanupTestStudent } from './helpers/seed-e2e.js';
import { _clearStateForTesting } from '../../packages/bot-discord/src/handlers/dm-handler.js';
import { mswServer, handlers } from '../msw-server.js';

// Minimal valid PDF (just enough bytes for MIME check by Discord)
const pdfHeader = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
);

// Minimal valid 1x1 PNG (signature + IHDR + IDAT + IEND)
const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixels
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth 8, color type RGB
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe('Exercise submission', () => {
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

  it('student sends file attachment, bot processes it', async () => {
    mswServer.use(handlers.anthropicSuccess('Файл получен и обработан. Спасибо за работу!'));

    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    // Register listener BEFORE send to avoid race condition (pitfall 7)
    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send({
      content: 'Вот моё задание по модулю 1',
      files: [{ attachment: pdfHeader, name: 'homework.pdf' }],
    });

    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('student sends image attachment', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send({
      content: 'Скриншот задания',
      files: [{ attachment: pngBuffer, name: 'screenshot.png' }],
    });

    const reply = await replyPromise;

    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('student sends text with link (URL extraction)', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send('Задание в Google Docs: https://docs.google.com/document/d/abc123/edit');

    const reply = await replyPromise;

    // Handler extracts URLs from content as pending attachments
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);

  it('student sends message without attachment (text-only submission context)', async () => {
    const dmChannel = await testUserBot.users.createDM(devBot.user!.id);

    const replyPromise = waitForMessage(
      testUserBot,
      (m) => m.author.id === devBot.user!.id && m.channel.id === dmChannel.id,
      15_000
    );

    await dmChannel.send('Я закончил модуль 2, могу ли я получить обратную связь?');

    const reply = await replyPromise;

    // Agent responds even without file attachment
    expect(reply.content.length).toBeGreaterThan(0);
  }, 30_000);
});
