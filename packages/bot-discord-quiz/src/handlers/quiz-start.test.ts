import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ButtonInteraction } from 'discord.js';
import type { StudentQuizSession, QuizQuestion } from '@assistme/core';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted ensures these are available when factories run)
// ---------------------------------------------------------------------------

const {
  mockGetQuizSession,
  mockGetStudentByDiscordId,
  mockUpdateQuizSession,
  mockGetQuestionsByQuiz,
  mockLogger,
  mockSendQuestion,
} = vi.hoisted(() => ({
  mockGetQuizSession: vi.fn(),
  mockGetStudentByDiscordId: vi.fn(),
  mockUpdateQuizSession: vi.fn(),
  mockGetQuestionsByQuiz: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  mockSendQuestion: vi.fn(),
}));

vi.mock('@assistme/core', () => ({
  getQuizSession: mockGetQuizSession,
  getStudentByDiscordId: mockGetStudentByDiscordId,
  updateQuizSession: mockUpdateQuizSession,
  getQuestionsByQuiz: mockGetQuestionsByQuiz,
  logger: mockLogger,
}));

vi.mock('../utils/quiz-flow.js', () => ({
  sendQuestion: mockSendQuestion,
  advanceOrComplete: vi.fn(),
}));

import { handleQuizStart } from './quiz-start.js';

// ---------------------------------------------------------------------------
// Local fixture helpers
// ---------------------------------------------------------------------------

function makeSession(overrides?: Partial<StudentQuizSession>): StudentQuizSession {
  return {
    id: 'session-1',
    student_id: 'student-1',
    quiz_id: 'quiz-1',
    status: 'not_started',
    current_question: 0,
    score: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeQuestion(overrides?: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: 'q-1',
    quiz_id: 'quiz-1',
    question_number: 1,
    type: 'mcq',
    question_text: 'What is 2+2?',
    choices: { A: '3', B: '4', C: '5', D: '6' },
    correct_answer: 'B',
    explanation: 'Basic math',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeButtonInteraction(customId: string, userId = 'user-1') {
  const dmChannel = { send: vi.fn().mockResolvedValue(undefined) };
  return {
    customId,
    user: { id: userId, createDM: vi.fn().mockResolvedValue(dmChannel) },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    replied: false,
    deferred: false,
    _dmChannel: dmChannel,
  } as unknown as ButtonInteraction & { _dmChannel: { send: ReturnType<typeof vi.fn> } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleQuizStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendQuestion.mockResolvedValue(undefined);
    mockGetStudentByDiscordId.mockResolvedValue({ id: 'student-1' });
  });

  it('QUIZ-01: defers reply with ephemeral:true before any DB call', async () => {
    const session = makeSession({ status: 'not_started' });
    const questions = [makeQuestion()];
    const updatedSession = makeSession({ status: 'in_progress', started_at: new Date().toISOString() });
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockUpdateQuizSession.mockResolvedValueOnce(updatedSession);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    // deferReply is called first
    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    // DB call happens after defer
    expect(mockGetQuizSession).toHaveBeenCalledWith('session-1');
  });

  it('QUIZ-01: starts quiz — updates session to in_progress with started_at', async () => {
    const session = makeSession({ status: 'not_started' });
    const questions = [makeQuestion()];
    const updatedSession = makeSession({ status: 'in_progress', started_at: '2026-01-01T10:00:00Z' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockUpdateQuizSession.mockResolvedValueOnce(updatedSession);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    expect(mockUpdateQuizSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ status: 'in_progress', started_at: expect.any(String) })
    );
    expect(mockSendQuestion).toHaveBeenCalledWith(
      expect.anything(),
      updatedSession,
      questions[0],
      1
    );
  });

  it('QUIZ-08: completed quiz — editReply contains "завершён", sendQuestion NOT called', async () => {
    const session = makeSession({ status: 'completed' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('завершён');
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it('QUIZ-08: expired quiz — editReply contains "истекло", sendQuestion NOT called', async () => {
    const session = makeSession({ status: 'expired_incomplete' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('истекло');
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it('Resume: in_progress session — sends recap containing "остановились", calls sendQuestion', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 1 });
    const questions = [makeQuestion({ id: 'q-1', question_number: 1 }), makeQuestion({ id: 'q-2', question_number: 2 })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_start_session-1');
    const dmChannel = (interaction as ReturnType<typeof makeButtonInteraction>)._dmChannel;

    await handleQuizStart(interaction);

    // DM channel should receive recap message containing 'остановились'
    expect(dmChannel.send).toHaveBeenCalledWith(expect.stringContaining('остановились'));
    expect(mockSendQuestion).toHaveBeenCalledWith(dmChannel, session, questions[1], 2);
  });

  it('Not found — editReply contains "не найден"', async () => {
    mockGetQuizSession.mockResolvedValueOnce(null);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('не найден');
  });

  it('No questions — editReply contains "не найдены"', async () => {
    const session = makeSession({ status: 'not_started' });
    const updatedSession = makeSession({ status: 'in_progress', started_at: '2026-01-01T10:00:00Z' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockUpdateQuizSession.mockResolvedValueOnce(updatedSession);
    mockGetQuestionsByQuiz.mockResolvedValueOnce([]);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('не найдены');
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it('rejects when Discord user is not the session owner', async () => {
    const session = makeSession({ student_id: 'other-student' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetStudentByDiscordId.mockResolvedValueOnce({ id: 'student-1' });
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('не назначен');
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it('reverts to not_started when getQuestionsByQuiz throws after status change', async () => {
    const session = makeSession({ status: 'not_started' });
    const updatedSession = makeSession({ status: 'in_progress', started_at: '2026-01-01T10:00:00Z' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockUpdateQuizSession.mockResolvedValueOnce(updatedSession); // first call: start
    mockUpdateQuizSession.mockResolvedValueOnce(undefined); // second call: revert
    mockGetQuestionsByQuiz.mockRejectedValueOnce(new Error('DB connection failed'));
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    // Should revert status to not_started
    expect(mockUpdateQuizSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ status: 'not_started', started_at: null }),
    );
    // Should show error message
    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('Ошибка');
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });

  it('rejects when student not found in DB', async () => {
    const session = makeSession();
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetStudentByDiscordId.mockResolvedValueOnce(null);
    const interaction = makeButtonInteraction('quiz_start_session-1');

    await handleQuizStart(interaction);

    const replyContent = (interaction.editReply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { content: string };
    expect(replyContent.content).toContain('не назначен');
    expect(mockSendQuestion).not.toHaveBeenCalled();
  });
});
