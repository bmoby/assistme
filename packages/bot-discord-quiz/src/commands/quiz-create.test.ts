import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GuildMember } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';

// ============================================
// Mocks (hoisted before imports)
// ============================================

const { registeredButtons, mockFetch } = vi.hoisted(() => {
  return {
    registeredButtons: new Map<string, (interaction: ButtonInteraction) => Promise<void>>(),
    mockFetch: vi.fn(),
  };
});

vi.mock('@assistme/core', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  createQuiz: vi.fn(),
  createQuizQuestion: vi.fn(),
  getActiveStudents: vi.fn(),
  createQuizSession: vi.fn(),
}));

vi.mock('../ai/parse-quiz.js', () => ({
  parseQuizFromTxt: vi.fn(),
}));

vi.mock('../handlers/index.js', () => ({
  registerButton: vi.fn((prefix: string, handler: (interaction: ButtonInteraction) => Promise<void>) => {
    registeredButtons.set(prefix, handler);
  }),
}));

vi.mock('../utils/auth.js', () => ({
  isAdmin: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetch);

import { handleQuizCreate } from './quiz-create.js';
import { createQuiz, createQuizQuestion, getActiveStudents, createQuizSession } from '@assistme/core';
import { parseQuizFromTxt } from '../ai/parse-quiz.js';
import { isAdmin } from '../utils/auth.js';

const mockCreateQuiz = vi.mocked(createQuiz);
const mockCreateQuizQuestion = vi.mocked(createQuizQuestion);
const mockGetActiveStudents = vi.mocked(getActiveStudents);
const mockCreateQuizSession = vi.mocked(createQuizSession);
const mockParseQuiz = vi.mocked(parseQuizFromTxt);
const mockIsAdmin = vi.mocked(isAdmin);

// ============================================
// Helpers: Build mock Discord interactions
// ============================================

function buildAdminMember(userId: string = 'admin-1'): GuildMember {
  const base = Object.create(GuildMember.prototype) as Record<string, unknown>;
  Object.defineProperties(base, {
    id: { value: userId, writable: true, configurable: true, enumerable: true },
    user: { value: { id: userId, bot: false }, writable: true, configurable: true, enumerable: true },
    roles: {
      value: { cache: { some: (pred: (r: { name: string }) => boolean) => pred({ name: 'tsarag' }) } },
      writable: true, configurable: true, enumerable: true,
    },
    createDM: {
      value: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue(undefined) }),
      writable: true, configurable: true, enumerable: true,
    },
  });
  return base as unknown as GuildMember;
}

function buildNonAdminMember(userId: string = 'user-1'): GuildMember {
  const base = Object.create(GuildMember.prototype) as Record<string, unknown>;
  Object.defineProperties(base, {
    id: { value: userId, writable: true, configurable: true, enumerable: true },
    user: { value: { id: userId, bot: false }, writable: true, configurable: true, enumerable: true },
    roles: {
      value: { cache: { some: () => false } },
      writable: true, configurable: true, enumerable: true,
    },
  });
  return base as unknown as GuildMember;
}

function buildCommandInteraction(overrides: {
  member?: GuildMember;
  userId?: string;
  sessionNumber?: number;
  attachment?: { name: string; url: string; contentType?: string };
}): ChatInputCommandInteraction {
  const member = overrides.member ?? buildAdminMember(overrides.userId ?? 'admin-1');
  const userId = overrides.userId ?? (member as unknown as { id: string }).id;

  const mockGuildMembersFetch = vi.fn();

  return {
    user: { id: userId },
    member,
    guild: {
      id: 'guild-1',
      members: { fetch: mockGuildMembersFetch },
    },
    options: {
      getInteger: (name: string, _required?: boolean) => {
        if (name === 'session') return overrides.sessionNumber ?? 5;
        return null;
      },
      getAttachment: (name: string, _required?: boolean) => {
        if (name === 'fichier') {
          return overrides.attachment ?? { name: 'quiz.txt', url: 'https://cdn.discord.com/quiz.txt', contentType: 'text/plain' };
        }
        return null;
      },
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    replied: false,
    deferred: false,
  } as unknown as ChatInputCommandInteraction;
}

function buildButtonInteraction(customId: string, userId: string = 'admin-1'): ButtonInteraction {
  const member = buildAdminMember(userId);
  return {
    customId,
    user: { id: userId },
    member,
    guild: {
      id: 'guild-1',
      members: {
        fetch: vi.fn(),
      },
    },
    update: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    replied: false,
    deferred: false,
  } as unknown as ButtonInteraction;
}

// ============================================
// Fixtures
// ============================================

const VALID_PARSED_QUIZ = {
  title: 'Quiz Session 5',
  questions: [
    { question_number: 1, type: 'mcq' as const, question_text: 'Q1?', choices: { A: 'Yes', B: 'No' }, correct_answer: 'A', explanation: 'Because.' },
    { question_number: 2, type: 'true_false' as const, question_text: 'Q2?', choices: null, correct_answer: 'true', explanation: null },
    { question_number: 3, type: 'open' as const, question_text: 'Q3?', choices: null, correct_answer: 'Some answer', explanation: null },
  ],
};

// ============================================
// Tests
// ============================================

describe('handleQuizCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockIsAdmin.mockReturnValue(true);
  });

  it('rejects non-admin user', async () => {
    mockIsAdmin.mockReturnValue(false);
    const interaction = buildCommandInteraction({ member: buildNonAdminMember() });

    await handleQuizCreate(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Commande reservee au formateur.', ephemeral: true }),
    );
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });

  it('rejects wrong file extension', async () => {
    const interaction = buildCommandInteraction({
      attachment: { name: 'quiz.pdf', url: 'https://cdn.discord.com/quiz.pdf', contentType: 'application/pdf' },
    });

    await handleQuizCreate(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('.txt'),
    );
  });

  it('rejects empty TXT file', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('  ') });
    const interaction = buildCommandInteraction({});

    await handleQuizCreate(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith('Le fichier est vide.');
  });

  it('shows preview embed after successful parsing', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('quiz content here') });
    mockParseQuiz.mockResolvedValue(VALID_PARSED_QUIZ);
    const interaction = buildCommandInteraction({ sessionNumber: 5 });

    await handleQuizCreate(interaction);

    expect(mockParseQuiz).toHaveBeenCalledWith('quiz content here', 5);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([expect.anything()]),
        components: expect.arrayContaining([expect.anything()]),
      }),
    );
  });

  it('cancel button clears pending data and shows cancelled message', async () => {
    // First trigger handleQuizCreate to store pending data
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('quiz content') });
    mockParseQuiz.mockResolvedValue(VALID_PARSED_QUIZ);
    const interaction = buildCommandInteraction({ userId: 'admin-42', sessionNumber: 5 });
    await handleQuizCreate(interaction);

    // Now simulate cancel button
    const cancelHandler = registeredButtons.get('quiz_cancel_');
    expect(cancelHandler).toBeDefined();

    const buttonInteraction = buildButtonInteraction('quiz_cancel_admin-42_5', 'admin-42');
    await cancelHandler!(buttonInteraction);

    expect(buttonInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('annule'),
      }),
    );
  });

  it('confirm button writes quiz + questions to DB and dispatches DMs', async () => {
    // First trigger handleQuizCreate to store pending data
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('quiz content') });
    mockParseQuiz.mockResolvedValue(VALID_PARSED_QUIZ);
    const interaction = buildCommandInteraction({ userId: 'admin-42', sessionNumber: 5 });
    await handleQuizCreate(interaction);

    // Setup DB mocks
    mockCreateQuiz.mockResolvedValue({
      id: 'quiz-uuid-1',
      session_number: 5,
      status: 'active',
      questions_data: null,
      original_txt: null,
      created_at: new Date().toISOString(),
      closed_at: null,
    });
    mockCreateQuizQuestion.mockResolvedValue({
      id: 'qq-1',
      quiz_id: 'quiz-uuid-1',
      question_number: 1,
      type: 'mcq',
      question_text: 'Q1?',
      choices: null,
      correct_answer: 'A',
      explanation: null,
      created_at: new Date().toISOString(),
    });

    // Mock active students
    const mockDmSend = vi.fn().mockResolvedValue(undefined);
    const mockCreateDM = vi.fn().mockResolvedValue({ send: mockDmSend });
    const mockMemberFetch = vi.fn().mockResolvedValue({ createDM: mockCreateDM });

    mockGetActiveStudents.mockResolvedValue([
      { id: 's1', name: 'Student 1', discord_id: 'discord-s1', phone: null, email: null, telegram_id: null, session: 1, status: 'active', payment_status: 'paid', payment_amount: null, payment_method: null, payment_details: null, pod_id: null, mentor_id: null, enrolled_at: null, completed_at: null, notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: 's2', name: 'Student 2', discord_id: 'discord-s2', phone: null, email: null, telegram_id: null, session: 1, status: 'active', payment_status: 'paid', payment_amount: null, payment_method: null, payment_details: null, pod_id: null, mentor_id: null, enrolled_at: null, completed_at: null, notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ]);

    mockCreateQuizSession.mockResolvedValue({
      id: 'session-uuid-1',
      student_id: 's1',
      quiz_id: 'quiz-uuid-1',
      status: 'not_started',
      current_question: 0,
      score: null,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    });

    // Now simulate confirm button
    const confirmHandler = registeredButtons.get('quiz_confirm_');
    expect(confirmHandler).toBeDefined();

    const buttonInteraction = buildButtonInteraction('quiz_confirm_admin-42_5', 'admin-42');
    // Set up guild.members.fetch on the button interaction
    (buttonInteraction.guild as unknown as Record<string, unknown>).members = { fetch: mockMemberFetch };

    await confirmHandler!(buttonInteraction);

    // Verify DB writes
    expect(mockCreateQuiz).toHaveBeenCalledOnce();
    expect(mockCreateQuizQuestion).toHaveBeenCalledTimes(3); // 3 questions
    expect(mockCreateQuizSession).toHaveBeenCalledTimes(2); // 2 students

    // Verify success embed (green color = 0x57F287)
    expect(buttonInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ color: 0x57F287 }),
          }),
        ]),
      }),
    );
  });

  it('reports partial failure when some DMs fail', async () => {
    // First trigger handleQuizCreate to store pending data
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('quiz content') });
    mockParseQuiz.mockResolvedValue(VALID_PARSED_QUIZ);
    const interaction = buildCommandInteraction({ userId: 'admin-42', sessionNumber: 5 });
    await handleQuizCreate(interaction);

    // Setup DB mocks
    mockCreateQuiz.mockResolvedValue({
      id: 'quiz-uuid-1',
      session_number: 5,
      status: 'active',
      questions_data: null,
      original_txt: null,
      created_at: new Date().toISOString(),
      closed_at: null,
    });
    mockCreateQuizQuestion.mockResolvedValue({
      id: 'qq-1', quiz_id: 'quiz-uuid-1', question_number: 1, type: 'mcq',
      question_text: 'Q1?', choices: null, correct_answer: 'A', explanation: null, created_at: new Date().toISOString(),
    });

    // 2 students: 1 success, 1 DM fail
    mockGetActiveStudents.mockResolvedValue([
      { id: 's1', name: 'Student 1', discord_id: 'discord-s1', phone: null, email: null, telegram_id: null, session: 1, status: 'active', payment_status: 'paid', payment_amount: null, payment_method: null, payment_details: null, pod_id: null, mentor_id: null, enrolled_at: null, completed_at: null, notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: 's2', name: 'Student 2', discord_id: 'discord-s2', phone: null, email: null, telegram_id: null, session: 1, status: 'active', payment_status: 'paid', payment_amount: null, payment_method: null, payment_details: null, pod_id: null, mentor_id: null, enrolled_at: null, completed_at: null, notes: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ]);

    let callCount = 0;
    mockCreateQuizSession.mockImplementation(async () => {
      callCount++;
      return {
        id: `session-uuid-${callCount}`,
        student_id: callCount === 1 ? 's1' : 's2',
        quiz_id: 'quiz-uuid-1',
        status: 'not_started' as const,
        current_question: 0,
        score: null,
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
    });

    // 1st student: DM success, 2nd student: DM failure
    const mockDmSendOk = vi.fn().mockResolvedValue(undefined);
    const mockDmSendFail = vi.fn().mockRejectedValue(new Error('DMs closed'));

    const mockMemberFetch = vi.fn()
      .mockResolvedValueOnce({ createDM: vi.fn().mockResolvedValue({ send: mockDmSendOk }) })
      .mockResolvedValueOnce({ createDM: vi.fn().mockResolvedValue({ send: mockDmSendFail }) });

    const confirmHandler = registeredButtons.get('quiz_confirm_');
    const buttonInteraction = buildButtonInteraction('quiz_confirm_admin-42_5', 'admin-42');
    (buttonInteraction.guild as unknown as Record<string, unknown>).members = { fetch: mockMemberFetch };

    await confirmHandler!(buttonInteraction);

    // Warning embed (yellow = 0xFEE75C)
    expect(buttonInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ color: 0xFEE75C }),
          }),
        ]),
      }),
    );
  });

  it('handles no active students case', async () => {
    // First trigger handleQuizCreate to store pending data
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('quiz content') });
    mockParseQuiz.mockResolvedValue(VALID_PARSED_QUIZ);
    const interaction = buildCommandInteraction({ userId: 'admin-42', sessionNumber: 5 });
    await handleQuizCreate(interaction);

    // DB mocks
    mockCreateQuiz.mockResolvedValue({
      id: 'quiz-uuid-1', session_number: 5, status: 'active', questions_data: null, original_txt: null, created_at: new Date().toISOString(), closed_at: null,
    });
    mockCreateQuizQuestion.mockResolvedValue({
      id: 'qq-1', quiz_id: 'quiz-uuid-1', question_number: 1, type: 'mcq',
      question_text: 'Q1?', choices: null, correct_answer: 'A', explanation: null, created_at: new Date().toISOString(),
    });

    // No active students
    mockGetActiveStudents.mockResolvedValue([]);

    const confirmHandler = registeredButtons.get('quiz_confirm_');
    const buttonInteraction = buildButtonInteraction('quiz_confirm_admin-42_5', 'admin-42');

    await confirmHandler!(buttonInteraction);

    // Should show info message about no students
    expect(buttonInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining('Aucun etudiant actif'),
            }),
          }),
        ]),
      }),
    );
  });
});
