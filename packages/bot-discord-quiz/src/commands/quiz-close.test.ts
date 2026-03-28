import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GuildMember } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';

// ============================================
// Mocks (hoisted before imports)
// ============================================

const { registeredButtons } = vi.hoisted(() => {
  return {
    registeredButtons: new Map<string, (interaction: ButtonInteraction) => Promise<void>>(),
  };
});

vi.mock('@assistme/core', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  getQuizBySession: vi.fn(),
  getSessionsByQuiz: vi.fn(),
  updateQuizStatus: vi.fn(),
  updateQuizSession: vi.fn(),
}));

vi.mock('../handlers/index.js', () => ({
  registerButton: vi.fn((prefix: string, handler: (interaction: ButtonInteraction) => Promise<void>) => {
    registeredButtons.set(prefix, handler);
  }),
}));

vi.mock('../utils/auth.js', () => ({
  isAdmin: vi.fn(),
}));

import { handleQuizClose } from './quiz-close.js';
import { getQuizBySession, getSessionsByQuiz, updateQuizStatus, updateQuizSession } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';

const mockGetQuizBySession = vi.mocked(getQuizBySession);
const mockGetSessionsByQuiz = vi.mocked(getSessionsByQuiz);
const mockUpdateQuizStatus = vi.mocked(updateQuizStatus);
const mockUpdateQuizSession = vi.mocked(updateQuizSession);
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
  sessionNumber?: number;
}) {
  const member = overrides.member ?? buildAdminMember();

  return {
    user: { id: (member as unknown as { id: string }).id },
    member,
    guild: { id: 'guild-1' },
    options: {
      getInteger: (name: string, _required?: boolean) => {
        if (name === 'session') return overrides.sessionNumber ?? 5;
        return null;
      },
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    replied: false,
    deferred: false,
  } as unknown as Parameters<typeof handleQuizClose>[0];
}

function buildButtonInteraction(customId: string): ButtonInteraction {
  const member = buildAdminMember();
  return {
    customId,
    user: { id: 'admin-1' },
    member,
    guild: { id: 'guild-1' },
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

const ACTIVE_QUIZ = {
  id: 'quiz-1',
  session_number: 5,
  status: 'active' as const,
  questions_data: null,
  original_txt: null,
  created_at: new Date().toISOString(),
  closed_at: null,
};

const CLOSED_QUIZ = {
  ...ACTIVE_QUIZ,
  status: 'closed' as const,
  closed_at: new Date().toISOString(),
};

const QUIZ_SESSIONS = [
  { id: 'qs-1', student_id: 's1', quiz_id: 'quiz-1', status: 'in_progress' as const, current_question: 2, score: null, started_at: new Date().toISOString(), completed_at: null, created_at: new Date().toISOString() },
  { id: 'qs-2', student_id: 's2', quiz_id: 'quiz-1', status: 'in_progress' as const, current_question: 1, score: null, started_at: new Date().toISOString(), completed_at: null, created_at: new Date().toISOString() },
  { id: 'qs-3', student_id: 's3', quiz_id: 'quiz-1', status: 'not_started' as const, current_question: 0, score: null, started_at: null, completed_at: null, created_at: new Date().toISOString() },
  { id: 'qs-4', student_id: 's4', quiz_id: 'quiz-1', status: 'completed' as const, current_question: 5, score: 80, started_at: new Date().toISOString(), completed_at: new Date().toISOString(), created_at: new Date().toISOString() },
];

// ============================================
// Tests
// ============================================

describe('handleQuizClose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockReturnValue(true);
  });

  it('rejects non-admin user', async () => {
    mockIsAdmin.mockReturnValue(false);
    const interaction = buildCommandInteraction({ member: buildNonAdminMember() });

    await handleQuizClose(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Commande reservee au formateur.', ephemeral: true }),
    );
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });

  it('handles no quiz found for session', async () => {
    mockGetQuizBySession.mockResolvedValue(null);
    const interaction = buildCommandInteraction({ sessionNumber: 99 });

    await handleQuizClose(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Aucun quiz actif'),
    );
  });

  it('handles already closed quiz', async () => {
    mockGetQuizBySession.mockResolvedValue(CLOSED_QUIZ);
    const interaction = buildCommandInteraction({ sessionNumber: 5 });

    await handleQuizClose(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('deja ferme'),
    );
  });

  it('shows confirmation embed with session counts', async () => {
    mockGetQuizBySession.mockResolvedValue(ACTIVE_QUIZ);
    mockGetSessionsByQuiz.mockResolvedValue(QUIZ_SESSIONS);
    const interaction = buildCommandInteraction({ sessionNumber: 5 });

    await handleQuizClose(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              color: 0xED4245, // DESTRUCTIVE_RED
            }),
          }),
        ]),
        components: expect.arrayContaining([expect.anything()]),
      }),
    );
  });

  it('confirm button closes quiz and expires sessions', async () => {
    // Get the confirm handler that was registered at module load time
    const confirmHandler = registeredButtons.get('quiz_close_confirm_');
    expect(confirmHandler).toBeDefined();

    // Mock DB: active quiz with in-progress and not-started sessions
    mockGetQuizBySession.mockResolvedValue(ACTIVE_QUIZ);
    mockGetSessionsByQuiz.mockResolvedValue(QUIZ_SESSIONS);
    mockUpdateQuizStatus.mockResolvedValue({ ...ACTIVE_QUIZ, status: 'closed' });
    mockUpdateQuizSession.mockResolvedValue(undefined as never);

    const buttonInteraction = buildButtonInteraction('quiz_close_confirm_5');
    await confirmHandler!(buttonInteraction);

    // Should close the quiz
    expect(mockUpdateQuizStatus).toHaveBeenCalledWith('quiz-1', 'closed');

    // Should expire in_progress (2) + not_started (1) = 3 sessions, skip completed (1)
    expect(mockUpdateQuizSession).toHaveBeenCalledTimes(3);
    expect(mockUpdateQuizSession).toHaveBeenCalledWith('qs-1', expect.objectContaining({ status: 'expired_incomplete' }));
    expect(mockUpdateQuizSession).toHaveBeenCalledWith('qs-2', expect.objectContaining({ status: 'expired_incomplete' }));
    expect(mockUpdateQuizSession).toHaveBeenCalledWith('qs-3', expect.objectContaining({ status: 'expired_incomplete' }));

    // Should show success message
    expect(buttonInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('ferme'),
      }),
    );
  });

  it('cancel button leaves quiz unchanged', async () => {
    const cancelHandler = registeredButtons.get('quiz_close_cancel_');
    expect(cancelHandler).toBeDefined();

    const buttonInteraction = buildButtonInteraction('quiz_close_cancel_5');
    await cancelHandler!(buttonInteraction);

    // Should NOT call updateQuizStatus
    expect(mockUpdateQuizStatus).not.toHaveBeenCalled();

    // Should show cancelled message
    expect(buttonInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Fermeture annulee.',
      }),
    );
  });

  it('confirm button rejects non-admin user', async () => {
    mockIsAdmin.mockReturnValue(false);
    const confirmHandler = registeredButtons.get('quiz_close_confirm_');
    expect(confirmHandler).toBeDefined();

    const buttonInteraction = buildButtonInteraction('quiz_close_confirm_5');
    await confirmHandler!(buttonInteraction);

    expect(buttonInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Action reservee au formateur.', ephemeral: true }),
    );
    expect(mockUpdateQuizStatus).not.toHaveBeenCalled();
  });

  it('cancel button rejects non-admin user', async () => {
    mockIsAdmin.mockReturnValue(false);
    const cancelHandler = registeredButtons.get('quiz_close_cancel_');
    expect(cancelHandler).toBeDefined();

    const buttonInteraction = buildButtonInteraction('quiz_close_cancel_5');
    await cancelHandler!(buttonInteraction);

    expect(buttonInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Action reservee au formateur.', ephemeral: true }),
    );
    expect(mockUpdateQuizStatus).not.toHaveBeenCalled();
  });
});
