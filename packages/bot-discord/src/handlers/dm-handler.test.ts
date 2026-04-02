/**
 * Unit tests for dm-handler.ts
 *
 * Strategy:
 * - Mock @assistme/core to prevent real DB/AI calls
 * - Mock utils/format.js and config.js
 * - Create a minimal Discord Client with event capture and channel cache
 * - Use _clearStateForTesting() in beforeEach to prevent state leaks
 *
 * Key implementation detail:
 * dm-handler uses a processingLocks queue pattern: the event handler sets up the
 * lock chain but does NOT await it before returning. So after client.__emit(),
 * we must drain the microtask queue to let processDmMessage actually run.
 * We use drainProcessing() which awaits a short timeout.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mocks declared before imports (hoisted by Vitest)
vi.mock('@assistme/core');
vi.mock('../utils/format.js', () => ({
  formatSubmissionNotification: vi.fn().mockReturnValue({
    toJSON: () => ({}),
  }),
  formatStudentFeedbackDM: vi.fn().mockReturnValue('feedback dm'),
  formatReviewThreadMessages: vi.fn().mockReturnValue({
    submissionMsg: 'Submission content',
    aiReviewMsg: 'AI review formatted text',
    historyMsg: null,
    imageUrl: null,
  }),
}));
vi.mock('../config.js', () => ({
  CHANNELS: {
    annonces: 'объявления',
    sessions: 'сессии',
    chat: 'чат',
    faq: 'faq',
    wins: 'победы',
    admin: 'админ',
  },
  ROLES: { admin: 'tsarag', student: 'student', mentor: 'mentor' },
}));

import { setupDmHandler, _clearStateForTesting } from './dm-handler.js';
import {
  runDmAgent,
  getStudentByDiscordId,
  getExercise,
  getSession,
  getAttachmentsByExercise,
  updateExercise,
  getSessionByNumber,
  getExercisesByStudent,
  submitExercise,
  resubmitExercise,
  getExerciseByStudentAndSession,
  addAttachment,
  getSupabase,
  deleteAttachmentsByExercise,
  reviewExercise,
  getSignedUrl,
} from '@assistme/core';
import { MessageBuilder, resetSeq } from '../__mocks__/discord/builders.js';
import { createStudent, createExercise, createSession } from '../__mocks__/fixtures/domain/index.js';
import type { Client } from 'discord.js';

// ============================================
// Helper: drain the event loop so async lock chains complete
// ============================================

/**
 * dm-handler queues processing via processingLocks but the event handler returns
 * before the processing promise resolves. We must wait for it to drain.
 */
async function drainProcessing(ms = 50): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// ============================================
// Mock client factory
// ============================================

function makeClient() {
  const handlers = new Map<string, ((...args: unknown[]) => Promise<void>) | ((...args: unknown[]) => void)>();
  const mockAdminChannel = {
    send: vi.fn().mockResolvedValue({ id: 'notif-msg-1' }),
    name: 'админ',
  };
  const mockThreadMessage = { edit: vi.fn().mockResolvedValue(undefined) };
  const mockThread = {
    isThread: () => true,
    messages: { fetch: vi.fn().mockResolvedValue(mockThreadMessage) },
  };

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(event, handler as (...args: unknown[]) => void);
    }),
    // Note: __emit does NOT await the processing lock — dm-handler returns before processing completes.
    // Callers must use drainProcessing() after __emit to wait for async work.
    __emit: async (event: string, ...args: unknown[]): Promise<void> => {
      const handler = handlers.get(event);
      if (handler) await handler(...args);
    },
    channels: {
      cache: {
        // dm-handler uses .find() to locate #админ channel
        find: vi.fn().mockReturnValue(mockAdminChannel),
        get: vi.fn().mockReturnValue(mockAdminChannel),
      },
      // fetch used by triggerAiReview for thread message edit (D-06)
      fetch: vi.fn().mockResolvedValue(mockThread),
    },
    _mockAdminChannel: mockAdminChannel,
    _mockThread: mockThread,
    _mockThreadMessage: mockThreadMessage,
  };
}

// ============================================
// Default mocks setup
// ============================================

const mockRunDmAgent = vi.mocked(runDmAgent);
const mockGetStudentByDiscordId = vi.mocked(getStudentByDiscordId);
const mockGetExercise = vi.mocked(getExercise);
const mockGetSession = vi.mocked(getSession);
const mockGetAttachmentsByExercise = vi.mocked(getAttachmentsByExercise);
const mockUpdateExercise = vi.mocked(updateExercise);
const mockReviewExercise = vi.mocked(reviewExercise);
const mockGetSignedUrl = vi.mocked(getSignedUrl);

// Phase 6 — submission flow mocks
const mockGetSessionByNumber = vi.mocked(getSessionByNumber);
const mockGetExercisesByStudent = vi.mocked(getExercisesByStudent);
const mockSubmitExercise = vi.mocked(submitExercise);
const mockResubmitExercise = vi.mocked(resubmitExercise);
const mockGetExerciseByStudentAndSession = vi.mocked(getExerciseByStudentAndSession);
const mockAddAttachment = vi.mocked(addAttachment);
const mockGetSupabase = vi.mocked(getSupabase);
const mockDeleteAttachmentsByExercise = vi.mocked(deleteAttachmentsByExercise);

let client: ReturnType<typeof makeClient>;

// ============================================
// Test suite
// ============================================

describe('dm-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
    _clearStateForTesting(); // CRITICAL: prevents conversation state leaks between tests

    // Default: student not found (override per test)
    mockGetStudentByDiscordId.mockResolvedValue(null);

    // Default agent response
    mockRunDmAgent.mockResolvedValue({
      text: 'Привет! Я DM агент.',
      submissionId: undefined,
    });

    // Setup attachment/exercise mocks for notification tests
    mockGetExercise.mockResolvedValue(createExercise({ id: 'exercise-1' }));
    mockGetSession.mockResolvedValue(createSession());
    mockGetAttachmentsByExercise.mockResolvedValue([]);
    mockUpdateExercise.mockResolvedValue(undefined as never);

    // Phase 6 defaults
    mockGetSessionByNumber.mockResolvedValue(createSession({ id: 'default-session', session_number: 1, status: 'published' }));
    mockGetExercisesByStudent.mockResolvedValue([]);
    mockGetExerciseByStudentAndSession.mockResolvedValue(null);
    mockSubmitExercise.mockResolvedValue(createExercise({ id: 'new-ex-1', status: 'submitted' }));
    mockResubmitExercise.mockResolvedValue(createExercise({ id: 'resub-ex-1', status: 'submitted', submission_count: 2 }));
    mockAddAttachment.mockResolvedValue(undefined as never);
    mockDeleteAttachmentsByExercise.mockResolvedValue([]);
    // Mock getSupabase for uploadFileToStorage: return object with storage.from().upload() returning { error: null }
    mockGetSupabase.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    } as never);

    // triggerAiReview mocks
    mockReviewExercise.mockResolvedValue({
      score: 7,
      recommendation: 'approve',
      strengths: [],
      improvements: [],
      detailedReview: '',
    } as never);
    mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com');

    client = makeClient();
    setupDmHandler(client as unknown as Client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Test 1: Bot messages ignored
  // ============================================

  it('ignores bot messages in production', async () => {
    const origEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const message = new MessageBuilder().asBot().asDM().withContent('I am a bot').build();

      await client.__emit('messageCreate', message);
      await drainProcessing();

      expect(mockGetStudentByDiscordId).not.toHaveBeenCalled();
      expect(mockRunDmAgent).not.toHaveBeenCalled();
    } finally {
      process.env['NODE_ENV'] = origEnv;
    }
  });

  // ============================================
  // Test 2: Guild messages ignored
  // ============================================

  it('ignores guild messages (non-DM)', async () => {
    const message = new MessageBuilder()
      .withContent('Hello in guild channel')
      .withAuthorId('user-123')
      .inGuild({})
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockGetStudentByDiscordId).not.toHaveBeenCalled();
    expect(mockRunDmAgent).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 3: Unknown user (not a student) — agent still called
  // ============================================

  it('handles DM from user not found in DB', async () => {
    mockGetStudentByDiscordId.mockResolvedValue(null);
    // dm-handler doesn't pre-check student — runDmAgent handles that internally
    mockRunDmAgent.mockResolvedValue({ text: 'Ты не зарегистрирован.', submissionId: undefined });

    const message = new MessageBuilder()
      .asDM()
      .withContent('Привет')
      .withAuthorId('unknown-user-999')
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    // Agent IS called (dm-handler doesn't pre-check student before runDmAgent)
    expect(mockRunDmAgent).toHaveBeenCalledWith(
      expect.objectContaining({ discordUserId: 'unknown-user-999' })
    );
    // Response sent to user via sendLongMessage -> message.reply
    expect(message.reply).toHaveBeenCalledWith('Ты не зарегистрирован.');
  });

  // ============================================
  // Test 4: Student DM routed to runDmAgent
  // ============================================

  it('routes student DM to runDmAgent', async () => {
    const student = createStudent({ discord_id: 'discord-123' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockRunDmAgent.mockResolvedValue({ text: 'Привет! Вот твой прогресс.', submissionId: undefined });

    const message = new MessageBuilder()
      .asDM()
      .withContent('Привет! Как мой прогресс?')
      .withAuthorId('discord-123')
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunDmAgent).toHaveBeenCalledOnce();
    expect(mockRunDmAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        discordUserId: 'discord-123',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Привет! Как мой прогресс?' }),
        ]),
      })
    );
    // Response sent via sendLongMessage -> message.reply (text <= 2000 chars)
    expect(message.reply).toHaveBeenCalledWith('Привет! Вот твой прогресс.');
  });

  // ============================================
  // Test 5: Conversation state accumulates across messages
  // ============================================

  it('accumulates conversation state across multiple messages', async () => {
    const student = createStudent({ discord_id: 'discord-456' });
    mockGetStudentByDiscordId.mockResolvedValue(student);

    // First message
    mockRunDmAgent.mockResolvedValueOnce({ text: 'Первый ответ агента.', submissionId: undefined });
    const msg1 = new MessageBuilder()
      .asDM()
      .withContent('Первое сообщение')
      .withAuthorId('discord-456')
      .build();
    await client.__emit('messageCreate', msg1);
    await drainProcessing();

    // Second message (state should accumulate)
    mockRunDmAgent.mockResolvedValueOnce({ text: 'Второй ответ агента.', submissionId: undefined });
    const msg2 = new MessageBuilder()
      .asDM()
      .withContent('Второе сообщение')
      .withAuthorId('discord-456')
      .build();
    await client.__emit('messageCreate', msg2);
    await drainProcessing();

    // Second call should include both messages + agent response from first turn
    expect(mockRunDmAgent).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockRunDmAgent.mock.calls[1]![0];
    const msgs = secondCallArgs.messages;

    expect(msgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Первое сообщение' }),
        expect.objectContaining({ role: 'assistant', content: 'Первый ответ агента.' }),
        expect.objectContaining({ role: 'user', content: 'Второе сообщение' }),
      ])
    );
  });

  // ============================================
  // Test 6: Processing lock prevents concurrent processing
  // ============================================

  it('processes messages sequentially via processingLocks (no concurrent runDmAgent)', async () => {
    const student = createStudent({ discord_id: 'discord-789' });
    mockGetStudentByDiscordId.mockResolvedValue(student);

    const order: number[] = [];

    // First call takes longer
    mockRunDmAgent.mockImplementationOnce(async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 20));
      return { text: 'Ответ 1', submissionId: undefined };
    });
    mockRunDmAgent.mockImplementationOnce(async () => {
      order.push(2);
      return { text: 'Ответ 2', submissionId: undefined };
    });

    const msg1 = new MessageBuilder().asDM().withContent('Сообщение 1').withAuthorId('discord-789').build();
    const msg2 = new MessageBuilder().asDM().withContent('Сообщение 2').withAuthorId('discord-789').build();

    // Emit both — the processingLocks queue ensures sequential execution
    const p1 = client.__emit('messageCreate', msg1);
    const p2 = client.__emit('messageCreate', msg2);
    await Promise.all([p1, p2]);

    // Wait for both processing locks to complete (first needs 20ms + queue chain for second)
    await drainProcessing(100);

    // Both processed, in order
    expect(order).toEqual([1, 2]);
    expect(mockRunDmAgent).toHaveBeenCalledTimes(2);
  });

  // ============================================
  // Test 7: Messages with attachments pass attachment info to agent
  // ============================================

  it('handles messages with image attachments', async () => {
    const student = createStudent({ discord_id: 'discord-att' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockRunDmAgent.mockResolvedValue({ text: 'Получил твой файл.', submissionId: undefined });

    // Mock fetch for attachment download
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    const message = new MessageBuilder()
      .asDM()
      .withContent('Смотри мой проект')
      .withAuthorId('discord-att')
      .withAttachment('att-1', {
        url: 'https://cdn.discord.com/file.png',
        name: 'file.png',
        contentType: 'image/png',
        size: 1024,
      })
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunDmAgent).toHaveBeenCalledOnce();
    const callArgs = mockRunDmAgent.mock.calls[0]![0];
    // pendingAttachments should contain the downloaded attachment
    expect(callArgs.pendingAttachments).toHaveLength(1);
    expect(callArgs.pendingAttachments[0]).toMatchObject({
      originalFilename: 'file.png',
      mimeType: 'image/png',
      type: 'image',
    });

    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 8: Admin channel notified when submission is created
  // ============================================

  it('notifies admin channel when submission is created', async () => {
    const student = createStudent({ discord_id: 'discord-sub' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockRunDmAgent.mockResolvedValue({ text: 'Задание принято!', submissionId: 'exercise-1' });

    const exercise = createExercise({ id: 'exercise-1', submission_count: 1 });
    mockGetExercise.mockResolvedValue(exercise);
    mockGetSession.mockResolvedValue(createSession());
    mockGetAttachmentsByExercise.mockResolvedValue([]);

    const message = new MessageBuilder()
      .asDM()
      .withContent('Вот моё задание')
      .withAuthorId('discord-sub')
      .build();

    await client.__emit('messageCreate', message);
    // Admin notification is fire-and-forget (void notifyAdminChannel(...)) — extra wait needed
    await drainProcessing(100);

    // Admin channel find should have been called (dm-handler uses .find() on channels.cache)
    expect(client.channels.cache.find).toHaveBeenCalled();
    // Admin channel send should have been called with embed + components
    expect(client._mockAdminChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      })
    );
  });

  // ============================================
  // Test 9: Error from runDmAgent is handled gracefully
  // ============================================

  it('handles runDmAgent throwing an error gracefully', async () => {
    const student = createStudent({ discord_id: 'discord-err' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockRunDmAgent.mockRejectedValue(new Error('Claude API timeout'));

    const message = new MessageBuilder()
      .asDM()
      .withContent('Помоги мне')
      .withAuthorId('discord-err')
      .build();

    // Should not throw
    await expect(client.__emit('messageCreate', message)).resolves.not.toThrow();
    await drainProcessing();

    // User should receive an error reply
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('❌')
    );
  });

  // ============================================
  // Test 10: State isolation via _clearStateForTesting
  // ============================================

  it('state is isolated between tests via _clearStateForTesting', async () => {
    const student = createStudent({ discord_id: 'discord-iso' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockRunDmAgent.mockResolvedValue({ text: 'Ответ 1', submissionId: undefined });

    // First message
    const msg1 = new MessageBuilder()
      .asDM()
      .withContent('Первое сообщение')
      .withAuthorId('discord-iso')
      .build();
    await client.__emit('messageCreate', msg1);
    await drainProcessing();

    // Clear state — simulates what beforeEach does between tests
    _clearStateForTesting();

    // Second message should start a fresh conversation
    mockRunDmAgent.mockResolvedValue({ text: 'Ответ свежий', submissionId: undefined });
    const msg2 = new MessageBuilder()
      .asDM()
      .withContent('Новое сообщение после сброса')
      .withAuthorId('discord-iso')
      .build();
    await client.__emit('messageCreate', msg2);
    await drainProcessing();

    expect(mockRunDmAgent).toHaveBeenCalledTimes(2);
    // Second call should NOT contain the first message in history.
    // Note: conv.messages is passed by reference and mutated after the call (assistant push),
    // so we verify via toHaveBeenCalledWith rather than inspecting the captured reference.
    expect(mockRunDmAgent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        discordUserId: 'discord-iso',
        // At call time, messages array starts fresh with only the new user message.
        // We verify the first element is the new message and it does NOT include old history.
        messages: expect.not.arrayContaining([
          expect.objectContaining({ content: 'Первое сообщение' }),
        ]),
      })
    );
    expect(mockRunDmAgent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Новое сообщение после сброса' }),
        ]),
      })
    );
  });

  // ============================================
  // Test 11: URL in message content added to pendingAttachments
  // ============================================

  it('extracts URLs from message content and adds to pending attachments', async () => {
    const student = createStudent({ discord_id: 'discord-url' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockRunDmAgent.mockResolvedValue({ text: 'Ссылка получена.', submissionId: undefined });

    const message = new MessageBuilder()
      .asDM()
      .withContent('Вот моя работа: https://github.com/user/project')
      .withAuthorId('discord-url')
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    const callArgs = mockRunDmAgent.mock.calls[0]![0];
    expect(callArgs.pendingAttachments).toHaveLength(1);
    expect(callArgs.pendingAttachments[0]).toMatchObject({
      url: 'https://github.com/user/project',
      type: 'url',
      mimeType: 'text/uri-list',
    });
  });

  // ============================================
  // Test 12: File too large → error reply, agent not called
  // ============================================

  it('rejects attachments that exceed 25 MB size limit', async () => {
    const student = createStudent({ discord_id: 'discord-large' });
    mockGetStudentByDiscordId.mockResolvedValue(student);

    const MAX_FILE_SIZE = 25 * 1024 * 1024;

    const message = new MessageBuilder()
      .asDM()
      .withContent('Огромный файл')
      .withAuthorId('discord-large')
      .withAttachment('att-big', {
        url: 'https://cdn.discord.com/bigfile.zip',
        name: 'bigfile.zip',
        contentType: 'application/zip',
        size: MAX_FILE_SIZE + 1,
      })
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunDmAgent).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('❌')
    );
  });

  // ============================================
  // Phase 6 submission handler tests (Tests 13-20)
  // ============================================

  /**
   * Helper: create a mock reply message that supports awaitMessageComponent.
   * Pass a customId to simulate a button press, or null to simulate a timeout.
   */
  function makeReplyMessageMock(buttonCustomId: string | null) {
    const editFn = vi.fn().mockResolvedValue(undefined);
    const awaitFn = buttonCustomId
      ? vi.fn().mockResolvedValue({
          customId: buttonCustomId,
          user: { id: 'test-user-id' },
          deferUpdate: vi.fn().mockResolvedValue(undefined),
        })
      : vi.fn().mockRejectedValue(new Error('Collector timeout'));

    return {
      awaitMessageComponent: awaitFn,
      edit: editFn,
      __awaitFn: awaitFn,
      __editFn: editFn,
    };
  }

  // ============================================
  // Test 13: Empty submission rejected (SUB-02)
  // ============================================

  it('rejects empty submission — no attachments and no student_comment', async () => {
    // Student must exist so we reach the empty check (not the student-not-found check)
    const student = createStudent({ discord_id: 'discord-empty' });
    mockGetStudentByDiscordId.mockResolvedValue(student);

    mockRunDmAgent.mockResolvedValue({
      text: 'Отправляю задание.',
      submissionIntent: { session_number: 3 }, // no student_comment
    });

    const message = new MessageBuilder()
      .asDM().withContent('Сдай задание').withAuthorId('discord-empty').build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    // No pendingAttachments in fresh conversation, no student_comment
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('Нечего отправлять')
    );
    expect(mockSubmitExercise).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 14: Invalid session rejected (UX-02)
  // ============================================

  it('rejects submission when session does not exist', async () => {
    // Student must exist so we reach the session check (not the student-not-found check)
    const student = createStudent({ discord_id: 'discord-bad-session' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockGetSessionByNumber.mockResolvedValue(null);

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    mockRunDmAgent.mockResolvedValue({
      text: 'Сдаю задание.',
      submissionIntent: { session_number: 99 },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Задание').withAuthorId('discord-bad-session')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'f.png', contentType: 'image/png', size: 100 })
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('99'));
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('не найдена'));
    expect(mockSubmitExercise).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 15: Preview embed shown with buttons (UX-01)
  // ============================================

  it('shows preview embed with Soumettre and Annuler buttons', async () => {
    // Student must exist to reach the preview embed logic
    const student = createStudent({ discord_id: 'discord-preview' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockGetSessionByNumber.mockResolvedValue(
      createSession({ id: 'sess-1', session_number: 3, title: 'CSS Basics', module: 1, status: 'published' })
    );

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    const replyMock = makeReplyMessageMock('submission_confirm');
    mockRunDmAgent.mockResolvedValue({
      text: 'Задание готово к отправке.',
      submissionIntent: { session_number: 3 },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Вот моё задание').withAuthorId('discord-preview')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'screenshot.png', contentType: 'image/png', size: 2048 })
      .build();
    (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

    await client.__emit('messageCreate', message);
    await drainProcessing(150);

    // Verify reply was called with embeds and components
    expect(message.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([expect.any(Object)]),
        components: expect.arrayContaining([expect.any(Object)]),
      })
    );
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 16: Soumettre button triggers DB write (UX-01)
  // ============================================

  it('executes submission when Soumettre button is clicked', async () => {
    const student = createStudent({ discord_id: 'discord-confirm' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockGetSessionByNumber.mockResolvedValue(
      createSession({ id: 'sess-c', session_number: 5, status: 'published' })
    );

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    const replyMock = makeReplyMessageMock('submission_confirm');
    mockRunDmAgent.mockResolvedValue({
      text: 'Задание подготовлено.',
      submissionIntent: { session_number: 5, student_comment: 'Мой ответ' },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Вот работа').withAuthorId('discord-confirm')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.pdf', name: 'work.pdf', contentType: 'application/pdf', size: 5000 })
      .build();
    (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

    await client.__emit('messageCreate', message);
    await drainProcessing(200);

    expect(mockSubmitExercise).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: student.id, session_id: 'sess-c', student_comment: 'Мой ответ' })
    );
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 16b: student_comment passed to resubmitExercise on re-submission
  // ============================================

  it('passes student_comment to resubmitExercise on re-submission', async () => {
    const student = createStudent({ discord_id: 'discord-resub-comment' });
    mockGetStudentByDiscordId.mockResolvedValue(student);

    const existingExercise = createExercise({
      id: 'ex-resub-comment',
      student_id: student.id,
      session_id: 'sess-rc',
      status: 'revision_needed',
      submission_count: 1,
    });
    mockGetExercisesByStudent.mockResolvedValue([existingExercise]);
    mockGetExerciseByStudentAndSession.mockResolvedValue(null);
    mockGetSessionByNumber.mockResolvedValue(
      createSession({ id: 'sess-rc', session_number: 6, status: 'published' })
    );
    mockResubmitExercise.mockResolvedValue(
      createExercise({ id: 'ex-resub-comment', status: 'submitted', submission_count: 2 })
    );

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    const replyMock = makeReplyMessageMock('submission_confirm');
    mockRunDmAgent.mockResolvedValue({
      text: 'Переотправляю.',
      submissionIntent: { session_number: 6, student_comment: 'Исправил' },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Исправил задание').withAuthorId('discord-resub-comment')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'fix.png', contentType: 'image/png', size: 100 })
      .build();
    (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

    await client.__emit('messageCreate', message);
    await drainProcessing(200);

    expect(mockResubmitExercise).toHaveBeenCalledWith(
      'ex-resub-comment',
      expect.objectContaining({ student_comment: 'Исправил' })
    );
    expect(mockSubmitExercise).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 17: Annuler button clears state (UX-04)
  // ============================================

  it('clears pendingAttachments when Annuler button is clicked', async () => {
    // Student must exist to reach the cancel button logic
    const student = createStudent({ discord_id: 'discord-cancel' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockGetSessionByNumber.mockResolvedValue(
      createSession({ id: 'sess-a', session_number: 2, status: 'published' })
    );

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    const replyMock = makeReplyMessageMock('submission_cancel');
    mockRunDmAgent.mockResolvedValue({
      text: 'Задание готово.',
      submissionIntent: { session_number: 2 },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Задание').withAuthorId('discord-cancel')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'f.png', contentType: 'image/png', size: 100 })
      .build();
    (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

    await client.__emit('messageCreate', message);
    await drainProcessing(150);

    // Should NOT call submitExercise
    expect(mockSubmitExercise).not.toHaveBeenCalled();
    // Should reply with cancellation message
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('отменена'));
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 18: Button timeout disables buttons, preserves attachments (D-02)
  // ============================================

  it('disables buttons on timeout and preserves pendingAttachments', async () => {
    // Student must exist to reach the awaitMessageComponent timeout logic
    const student = createStudent({ discord_id: 'discord-timeout' });
    mockGetStudentByDiscordId.mockResolvedValue(student);
    mockGetSessionByNumber.mockResolvedValue(
      createSession({ id: 'sess-t', session_number: 1, status: 'published' })
    );

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    // null = timeout: awaitMessageComponent rejects
    const replyMock = makeReplyMessageMock(null);
    mockRunDmAgent.mockResolvedValue({
      text: 'Задание готово.',
      submissionIntent: { session_number: 1 },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Задание').withAuthorId('discord-timeout')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'f.png', contentType: 'image/png', size: 100 })
      .build();
    (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

    await client.__emit('messageCreate', message);
    await drainProcessing(150);

    // Buttons should be disabled via previewMsg.edit
    expect(replyMock.__editFn).toHaveBeenCalled();
    // submitExercise NOT called on timeout
    expect(mockSubmitExercise).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 19: Error cleanup clears pendingAttachments (SUB-04)
  // ============================================

  it('clears pendingAttachments when runDmAgent throws (SUB-04)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    mockRunDmAgent.mockRejectedValue(new Error('Claude API failed'));

    // First message WITH attachment — pendingAttachments becomes non-empty before agent call
    const msg1 = new MessageBuilder()
      .asDM().withContent('Вот файл').withAuthorId('discord-err-cleanup')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'f.png', contentType: 'image/png', size: 100 })
      .build();

    await client.__emit('messageCreate', msg1);
    await drainProcessing();

    // Agent threw — pendingAttachments should have been cleared by the catch block
    // On second message, pendingAttachments should be empty (state was cleared)
    mockRunDmAgent.mockResolvedValue({
      text: 'Ответ.',
      submissionIntent: { session_number: 1 },
    });

    const msg2 = new MessageBuilder()
      .asDM().withContent('Попробую снова').withAuthorId('discord-err-cleanup')
      .build();

    await client.__emit('messageCreate', msg2);
    await drainProcessing();

    // Second call should have empty pendingAttachments (cleared by error handler)
    const secondCallArgs = mockRunDmAgent.mock.calls[1]?.[0];
    expect(secondCallArgs?.pendingAttachments).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  // ============================================
  // Test 20: Re-submission path calls resubmitExercise (UX-03)
  // ============================================

  it('calls resubmitExercise for re-submission when existing exercise has revision_needed status', async () => {
    const student = createStudent({ discord_id: 'discord-resub' });
    mockGetStudentByDiscordId.mockResolvedValue(student);

    const existingExercise = createExercise({
      id: 'ex-resub-1',
      student_id: student.id,
      session_id: 'sess-r',
      status: 'revision_needed',
      submission_count: 1,
    });
    mockGetExercisesByStudent.mockResolvedValue([existingExercise]);
    mockGetExerciseByStudentAndSession.mockResolvedValue(null);
    mockGetSessionByNumber.mockResolvedValue(
      createSession({ id: 'sess-r', session_number: 4, status: 'published' })
    );
    mockResubmitExercise.mockResolvedValue(
      createExercise({ id: 'ex-resub-1', status: 'submitted', submission_count: 2 })
    );

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as Response);

    const replyMock = makeReplyMessageMock('submission_confirm');
    mockRunDmAgent.mockResolvedValue({
      text: 'Переотправляю.',
      submissionIntent: { session_number: 4 },
    });

    const message = new MessageBuilder()
      .asDM().withContent('Исправил задание').withAuthorId('discord-resub')
      .withAttachment('att-1', { url: 'https://cdn.discord.com/f.png', name: 'fix.png', contentType: 'image/png', size: 100 })
      .build();
    (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

    await client.__emit('messageCreate', message);
    await drainProcessing(200);

    expect(mockResubmitExercise).toHaveBeenCalledWith(
      'ex-resub-1',
      expect.objectContaining({ submission_type: expect.any(String) })
    );
    expect(mockSubmitExercise).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // ============================================
  // triggerAiReview thread message edit tests (D-06, Phase 07)
  // ============================================

  describe('triggerAiReview thread message edit', () => {
    /**
     * Helper: trigger the full submission flow (submissionIntent + confirm button)
     * so that triggerAiReview fires (requires storagePaths.length > 0 from file attachment).
     *
     * triggerAiReview is called only from executeSubmission when storagePaths.length > 0.
     * This means we need a real file attachment downloaded to a buffer, uploaded to storage,
     * and a submit button confirm to execute the submission.
     */
    async function triggerSubmissionWithAttachment(
      exerciseForTrigger: ReturnType<typeof createExercise>,
      discordUserId = 'discord-trigger',
    ): Promise<{ message: ReturnType<typeof MessageBuilder.prototype.build>; fetchSpy: ReturnType<typeof vi.spyOn> }> {
      mockGetStudentByDiscordId.mockResolvedValue(
        createStudent({ id: 'student-1', discord_id: discordUserId })
      );
      mockGetSessionByNumber.mockResolvedValue(
        createSession({ id: 'session-1', session_number: 1, status: 'published', module: 1, exercise_description: null })
      );
      mockGetSession.mockResolvedValue(
        createSession({ id: 'session-1', session_number: 1, status: 'published', module: 1, exercise_description: null })
      );
      // No active submission (not a resubmission)
      mockGetExerciseByStudentAndSession.mockResolvedValue(null);
      mockGetExercisesByStudent.mockResolvedValue([]);
      // submitExercise returns exercise (triggerAiReview will call getExercise for fresh data)
      mockSubmitExercise.mockResolvedValue(exerciseForTrigger);
      // getExercise returns the same exercise with thread IDs (fresh fetch inside triggerAiReview)
      mockGetExercise.mockResolvedValue(exerciseForTrigger);
      mockGetAttachmentsByExercise.mockResolvedValue([]);
      // runDmAgent returns submissionIntent to go through preview-confirm flow
      mockRunDmAgent.mockResolvedValue({
        text: 'Задание принято!',
        submissionIntent: { session_number: 1, student_comment: 'My submission' },
      });

      // Mock global fetch for attachment download
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      } as Response);

      // Simulate confirm button click
      const replyMock = makeReplyMessageMock('submission_confirm');

      const message = new MessageBuilder()
        .asDM()
        .withContent('Вот мой файл')
        .withAuthorId(discordUserId)
        .withAttachment('att-trigger', {
          url: 'https://cdn.discord.com/trigger.png',
          name: 'trigger.png',
          contentType: 'image/png',
          size: 100,
        })
        .build();
      (message.reply as ReturnType<typeof vi.fn>).mockResolvedValueOnce(replyMock);

      await client.__emit('messageCreate', message);
      // Extra drain: triggerAiReview is fire-and-forget, needs more time to complete
      await drainProcessing(300);

      return { message, fetchSpy };
    }

    it('triggerAiReview edits thread AI message when review_thread_ai_message_id exists', async () => {
      const exercise = createExercise({
        id: 'ex-trigger-1',
        status: 'submitted',
        review_thread_id: 'thread-1',
        review_thread_ai_message_id: 'ai-msg-1',
      });

      const { fetchSpy } = await triggerSubmissionWithAttachment(exercise);

      // channels.fetch should have been called with the thread ID
      expect(client.channels.fetch).toHaveBeenCalledWith('thread-1');
      // Thread message edit should have been called with AI review text
      expect(client._mockThreadMessage.edit).toHaveBeenCalledOnce();
      expect(client._mockThreadMessage.edit).toHaveBeenCalledWith(
        expect.any(String)
      );

      fetchSpy.mockRestore();
    });

    it('triggerAiReview skips thread edit when review_thread_ai_message_id is null', async () => {
      const exercise = createExercise({
        id: 'ex-trigger-1',
        status: 'submitted',
        review_thread_id: null,
        review_thread_ai_message_id: null,
      });

      const { fetchSpy } = await triggerSubmissionWithAttachment(exercise);

      // Thread message edit should NOT have been called (guard: both IDs must be set)
      expect(client._mockThreadMessage.edit).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('triggerAiReview degrades gracefully when thread fetch fails (non-blocking)', async () => {
      const exercise = createExercise({
        id: 'ex-trigger-1',
        status: 'submitted',
        review_thread_id: 'thread-1',
        review_thread_ai_message_id: 'ai-msg-1',
      });

      // Override channels.fetch to reject (simulates Discord API error)
      (client.channels as { fetch: ReturnType<typeof vi.fn> }).fetch =
        vi.fn().mockRejectedValue(new Error('Discord API error'));

      const { message, fetchSpy } = await triggerSubmissionWithAttachment(exercise, 'discord-degrade');

      // The DM handler still completed — user got a confirm reply (submission successful)
      expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('✅'));
      // Thread message edit was NOT called (fetch failed before we got there)
      expect(client._mockThreadMessage.edit).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });
  });
});
