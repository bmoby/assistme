/**
 * Unit tests for review-buttons.ts
 *
 * Strategy (Approach A):
 * - Mock button-handler.ts to capture registered handlers in a Map
 * - registerReviewButtons() calls registerButton(prefix, handler) for each prefix
 * - Invoke captured handlers directly with fake ButtonInteraction objects
 * - Mock @assistme/core and local utils to prevent real DB/Discord calls
 *
 * Actual prefixes registered (from source):
 *   'review_open_'     → opens a review thread in #админ
 *   'review_approve_'  → approves exercise (part of handleReviewDecision)
 *   'review_revision_' → requests revision (part of handleReviewDecision)
 *   'review_session_'  → shows pending exercises for a session
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mocks declared before imports (hoisted by Vitest)
vi.mock('@assistme/core');

// Capture registered button handlers (Approach A)
const registeredHandlers = new Map<string, (interaction: unknown) => Promise<void>>();
vi.mock('./button-handler.js', () => ({
  registerButton: vi.fn((prefix: string, handler: (interaction: unknown) => Promise<void>) => {
    registeredHandlers.set(prefix, handler);
  }),
  handleButtonInteraction: vi.fn(),
}));

// Mock local utils
vi.mock('../utils/review-thread.js', () => ({
  createReviewThread: vi.fn().mockResolvedValue({ threadId: 'thread-1', aiMessageId: 'ai-msg-1' }),
}));
vi.mock('../utils/format.js', () => ({
  formatStudentFeedbackDM: vi.fn().mockReturnValue('DM feedback text'),
  formatSubmissionNotification: vi.fn().mockReturnValue({ toJSON: () => ({}) }),
  formatReviewThreadMessages: vi.fn().mockReturnValue({
    submissionMsg: 'Submission content',
    aiReviewMsg: null,
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

import { registerReviewButtons } from './review-buttons.js';
import {
  getExercise,
  getSession,
  getStudent,
  getSessionByNumber,
  getPendingExercisesBySession,
  updateExerciseStatus,
} from '@assistme/core';
import { ButtonInteractionBuilder, resetSeq } from '../__mocks__/discord/builders.js';
import { createExercise, createSession, createStudent } from '../__mocks__/fixtures/domain/index.js';
import { createReviewThread } from '../utils/review-thread.js';
import { TextChannel } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';

// ============================================
// Helper: invoke a registered button handler
// ============================================

async function invokeButton(prefix: string, interaction: unknown): Promise<void> {
  const handler = registeredHandlers.get(prefix);
  if (!handler) throw new Error(`No handler registered for prefix: ${prefix}`);
  await handler(interaction);
}

// ============================================
// Mock helpers
// ============================================

const mockGetExercise = vi.mocked(getExercise);
const mockGetSession = vi.mocked(getSession);
const mockGetStudent = vi.mocked(getStudent);
const mockGetSessionByNumber = vi.mocked(getSessionByNumber);
const mockGetPendingExercisesBySession = vi.mocked(getPendingExercisesBySession);
const mockUpdateExerciseStatus = vi.mocked(updateExerciseStatus);
const mockCreateReviewThread = vi.mocked(createReviewThread);

// ============================================
// Thread channel factory (for approve/revision handlers)
// ============================================

function makeThreadChannel(messages: unknown[] = []) {
  const messageMap = new Map(
    messages.map((m, i) => [String(i), m])
  );
  return {
    id: 'thread-1',
    name: 'Review thread',
    isThread: vi.fn().mockReturnValue(true),
    // messages.fetch returns a Map with filter/sort/map methods like Discord Collection
    messages: {
      fetch: vi.fn().mockResolvedValue({
        filter: (pred: (m: unknown) => boolean) => ({
          sort: (cmp: (a: unknown, b: unknown) => number) => ({
            map: (fn: (m: unknown) => unknown) => {
              const arr = Array.from(messageMap.values()).filter(pred);
              arr.sort(cmp as never);
              return arr.map(fn);
            },
          }),
        }),
        size: messageMap.size,
      }),
    },
    send: vi.fn().mockResolvedValue({ id: 'thread-msg-1' }),
    setArchived: vi.fn().mockResolvedValue(undefined),
  };
}

// ============================================
// Guild factory with admin channel
// ============================================

function makeAdminChannel() {
  // Use TextChannel.prototype as base so `ch instanceof TextChannel` checks pass.
  // This is required because handleReviewOpen uses `ch instanceof TextChannel` in its find predicate.
  const ch = Object.create(TextChannel.prototype) as Record<string, unknown>;
  Object.defineProperties(ch, {
    id: { value: 'admin-ch-1', writable: true, configurable: true, enumerable: true },
    name: { value: 'админ', writable: true, configurable: true, enumerable: true },
    threads: {
      value: {
        create: vi.fn().mockResolvedValue({
          id: 'new-thread-1',
          send: vi.fn().mockResolvedValue({ id: 'thread-msg' }),
        }),
      },
      writable: true, configurable: true, enumerable: true,
    },
    messages: {
      value: {
        fetch: vi.fn().mockResolvedValue({
          id: 'notif-msg-1',
          edit: vi.fn().mockResolvedValue(undefined),
          embeds: [],
          components: [],
        }),
      },
      writable: true, configurable: true, enumerable: true,
    },
    send: { value: vi.fn().mockResolvedValue({ id: 'ch-msg-1' }), writable: true, configurable: true, enumerable: true },
  });
  return ch as unknown as TextChannel;
}

function makeGuildWithAdminChannel(adminChannelOverride?: object) {
  const adminChannel = adminChannelOverride ?? makeAdminChannel();

  return {
    id: 'guild-1',
    name: 'Test Guild',
    channels: {
      cache: {
        find: vi.fn().mockImplementation((pred: (ch: unknown) => boolean) => {
          return pred(adminChannel) ? adminChannel : undefined;
        }),
      },
    },
    members: {
      fetch: vi.fn().mockResolvedValue(null),
    },
  };
}

// ============================================
// Test suite
// ============================================

describe('review-buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
    registeredHandlers.clear();

    // Register handlers fresh each time
    registerReviewButtons();

    // Default mocks
    mockGetExercise.mockResolvedValue(createExercise({ id: 'exercise-1', status: 'submitted' }));
    mockGetSession.mockResolvedValue(createSession());
    mockGetStudent.mockResolvedValue(createStudent({ id: 'student-1', discord_id: 'discord-1' }));
    mockGetSessionByNumber.mockResolvedValue(createSession());
    mockGetPendingExercisesBySession.mockResolvedValue([]);
    mockUpdateExerciseStatus.mockResolvedValue(undefined as never);
    mockCreateReviewThread.mockResolvedValue({ threadId: 'thread-1', aiMessageId: 'ai-msg-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Test 1: All button prefixes are registered
  // ============================================

  it('registers all 4 button prefixes', () => {
    expect(registeredHandlers.has('review_open_')).toBe(true);
    expect(registeredHandlers.has('review_approve_')).toBe(true);
    expect(registeredHandlers.has('review_revision_')).toBe(true);
    expect(registeredHandlers.has('review_session_')).toBe(true);
    expect(registeredHandlers.size).toBe(4);
  });

  // ============================================
  // Test 2: review_open_ fetches exercise and creates review thread
  // ============================================

  it('review_open_ button defers, fetches exercise and creates review thread', async () => {
    const guild = makeGuildWithAdminChannel();
    const student = createStudent({ id: 'student-1' });
    const exercise = createExercise({ id: 'exercise-1', status: 'submitted', student_id: 'student-1' });
    const session = createSession();

    mockGetExercise.mockResolvedValue(exercise);
    mockGetStudent.mockResolvedValue(student);
    mockGetSession.mockResolvedValue(session);

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_open_exercise-1')
      .withGuild(guild)
      .build();

    await invokeButton('review_open_', interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockGetExercise).toHaveBeenCalledWith('exercise-1');
    expect(mockGetStudent).toHaveBeenCalledWith('student-1');
    expect(mockCreateReviewThread).toHaveBeenCalledOnce();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Thread') })
    );
  });

  // ============================================
  // Test 3: review_open_ returns error when exercise not found
  // ============================================

  it('review_open_ returns error when exercise not found', async () => {
    mockGetExercise.mockResolvedValue(null);

    const guild = makeGuildWithAdminChannel();
    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_open_missing-exercise')
      .withGuild(guild)
      .build();

    await invokeButton('review_open_', interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('non trouve') })
    );
    expect(mockCreateReviewThread).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 4: review_open_ returns error when exercise already processed
  // ============================================

  it('review_open_ returns error when exercise is already processed (not submitted/ai_reviewed)', async () => {
    const exercise = createExercise({ id: 'exercise-1', status: 'approved' });
    mockGetExercise.mockResolvedValue(exercise);

    const guild = makeGuildWithAdminChannel();
    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_open_exercise-1')
      .withGuild(guild)
      .build();

    await invokeButton('review_open_', interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('deja traite') })
    );
    expect(mockCreateReviewThread).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 5: review_approve_ updates exercise status to 'approved' in thread
  // ============================================

  it('review_approve_ updates exercise status to approved and archives thread', async () => {
    const thread = makeThreadChannel([
      { author: { id: 'admin-user', bot: false }, content: 'Excellent travail!', createdTimestamp: 100 },
    ]);
    const guild = makeGuildWithAdminChannel();

    const exercise = createExercise({
      id: 'exercise-1',
      status: 'submitted',
      student_id: 'student-1',
      session_id: 'session-1',
    });
    mockGetExercise.mockResolvedValue(exercise);
    mockGetStudent.mockResolvedValue(
      createStudent({ id: 'student-1', discord_id: 'discord-student-1' })
    );

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_approve_exercise-1')
      .withGuild(guild)
      .withChannel(thread)
      .withClientUserId('bot-user-id')
      .build();

    await invokeButton('review_approve_', interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockGetExercise).toHaveBeenCalledWith('exercise-1');
    expect(mockUpdateExerciseStatus).toHaveBeenCalledWith(
      'exercise-1',
      'approved',
      expect.any(String) // feedback string
    );
    expect(thread.setArchived).toHaveBeenCalledWith(true);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Approuve') })
    );
  });

  // ============================================
  // Test 6: review_revision_ updates status to revision_needed
  // ============================================

  it('review_revision_ updates exercise status to revision_needed', async () => {
    const thread = makeThreadChannel([
      { author: { id: 'admin-user', bot: false }, content: 'Il faut ameliorer ceci.', createdTimestamp: 100 },
    ]);
    const guild = makeGuildWithAdminChannel();

    const exercise = createExercise({
      id: 'exercise-2',
      status: 'ai_reviewed',
      student_id: 'student-2',
    });
    mockGetExercise.mockResolvedValue(exercise);
    mockGetStudent.mockResolvedValue(
      createStudent({ id: 'student-2', discord_id: 'discord-student-2' })
    );

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_revision_exercise-2')
      .withGuild(guild)
      .withChannel(thread)
      .withClientUserId('bot-user-id')
      .build();

    await invokeButton('review_revision_', interaction);

    expect(mockUpdateExerciseStatus).toHaveBeenCalledWith(
      'exercise-2',
      'revision_needed',
      expect.any(String)
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Revision') })
    );
  });

  // ============================================
  // Test 7: review_approve_ returns error if not in a thread
  // ============================================

  it('review_approve_ returns error if used outside a thread', async () => {
    // Non-thread channel (isThread returns false)
    const nonThread = {
      id: 'ch-regular',
      name: 'general',
      isThread: vi.fn().mockReturnValue(false),
      messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
    };
    const guild = makeGuildWithAdminChannel();

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_approve_exercise-1')
      .withGuild(guild)
      .withChannel(nonThread)
      .build();

    await invokeButton('review_approve_', interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('thread') })
    );
    expect(mockUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 8: review_approve_ returns error when exercise not found
  // ============================================

  it('review_approve_ returns error when exercise not found', async () => {
    mockGetExercise.mockResolvedValue(null);
    const thread = makeThreadChannel();
    const guild = makeGuildWithAdminChannel();

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_approve_missing-ex')
      .withGuild(guild)
      .withChannel(thread)
      .build();

    await invokeButton('review_approve_', interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('non trouve') })
    );
    expect(mockUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 9: review_session_ shows pending exercises embed
  // ============================================

  it('review_session_ fetches pending exercises and shows embed with buttons', async () => {
    const session = createSession({ session_number: 3 });
    const exercises = [
      createExercise({ id: 'ex-1', student_id: 'st-1', status: 'submitted' }),
      createExercise({ id: 'ex-2', student_id: 'st-2', status: 'ai_reviewed' }),
    ];
    mockGetSessionByNumber.mockResolvedValue(session);
    mockGetPendingExercisesBySession.mockResolvedValue(exercises);
    mockGetStudent
      .mockResolvedValueOnce(createStudent({ id: 'st-1', name: 'Alice' }))
      .mockResolvedValueOnce(createStudent({ id: 'st-2', name: 'Bob' }));

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_session_3')
      .build();

    await invokeButton('review_session_', interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockGetSessionByNumber).toHaveBeenCalledWith(3);
    expect(mockGetPendingExercisesBySession).toHaveBeenCalledWith(3);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      })
    );
  });

  // ============================================
  // Test 10: review_session_ shows empty message when no pending exercises
  // ============================================

  it('review_session_ shows empty message when no pending exercises', async () => {
    mockGetSessionByNumber.mockResolvedValue(createSession({ session_number: 5 }));
    mockGetPendingExercisesBySession.mockResolvedValue([]);

    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_session_5')
      .build();

    await invokeButton('review_session_', interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('5') })
    );
  });

  // ============================================
  // Test 11: review_session_ handles invalid session number
  // ============================================

  it('review_session_ handles invalid (non-numeric) session number', async () => {
    const interaction = new ButtonInteractionBuilder()
      .withCustomId('review_session_abc')
      .build();

    await invokeButton('review_session_', interaction);

    // Should reply (not deferReply) with error for invalid session
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('invalide'), ephemeral: true })
    );
  });
});
