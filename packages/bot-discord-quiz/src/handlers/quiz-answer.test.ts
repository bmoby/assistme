import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ButtonInteraction } from 'discord.js';
import type { StudentQuizSession, QuizQuestion } from '@assistme/core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockGetQuizSession,
  mockGetQuestionsByQuiz,
  mockGetStudentByDiscordId,
  mockSaveAnswer,
  mockLogger,
  mockAdvanceOrComplete,
} = vi.hoisted(() => ({
  mockGetQuizSession: vi.fn(),
  mockGetQuestionsByQuiz: vi.fn(),
  mockGetStudentByDiscordId: vi.fn(),
  mockSaveAnswer: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  mockAdvanceOrComplete: vi.fn(),
}));

vi.mock('@assistme/core', () => ({
  getQuizSession: mockGetQuizSession,
  getQuestionsByQuiz: mockGetQuestionsByQuiz,
  getStudentByDiscordId: mockGetStudentByDiscordId,
  saveAnswer: mockSaveAnswer,
  logger: mockLogger,
}));

vi.mock('../utils/quiz-flow.js', () => ({
  advanceOrComplete: mockAdvanceOrComplete,
  sendQuestion: vi.fn(),
}));

import { handleQuizAnswer, _clearStateForTesting } from './quiz-answer.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSession(overrides?: Partial<StudentQuizSession>): StudentQuizSession {
  return {
    id: 'session-1',
    student_id: 'student-1',
    quiz_id: 'quiz-1',
    status: 'in_progress',
    current_question: 0,
    score: null,
    started_at: '2026-01-01T10:00:00Z',
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
    deferUpdate: vi.fn().mockResolvedValue(undefined),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Invoke handleQuizAnswer and drain the async lock queue */
async function invokeAndWait(interaction: ButtonInteraction): Promise<void> {
  handleQuizAnswer(interaction);
  // Flush microtask queue (lock is Promise-chained)
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

describe('handleQuizAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearStateForTesting();
    mockSaveAnswer.mockResolvedValue(undefined);
    mockAdvanceOrComplete.mockResolvedValue(null);
    mockGetStudentByDiscordId.mockResolvedValue({ id: 'student-1' });
  });

  it('defers update before DB calls', async () => {
    const session = makeSession();
    const questions = [makeQuestion({ correct_answer: 'B' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(interaction.deferUpdate).toHaveBeenCalled();
    // deferUpdate should be called before getQuizSession
    const deferOrder = (interaction.deferUpdate as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const dbOrder = mockGetQuizSession.mock.invocationCallOrder[0];
    expect(deferOrder).toBeLessThan(dbOrder!);
  });

  it('EVAL-01: MCQ correct answer — saveAnswer called with is_correct=true', async () => {
    const session = makeSession();
    const questions = [makeQuestion({ id: 'q-1', correct_answer: 'B' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(mockSaveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ is_correct: true, student_answer: 'B' })
    );
  });

  it('EVAL-01: MCQ incorrect answer — saveAnswer called with is_correct=false', async () => {
    const session = makeSession();
    const questions = [makeQuestion({ id: 'q-1', correct_answer: 'B' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_session-1_A');

    await invokeAndWait(interaction);

    expect(mockSaveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ is_correct: false, student_answer: 'A' })
    );
  });

  it('EVAL-02: True/false correct — saveAnswer with is_correct=true', async () => {
    const session = makeSession();
    const questions = [makeQuestion({ id: 'q-1', type: 'true_false', correct_answer: 'true' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_session-1_true');

    await invokeAndWait(interaction);

    expect(mockSaveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ is_correct: true, student_answer: 'true' })
    );
  });

  it('QUIZ-05: saves answer and calls advanceOrComplete', async () => {
    const session = makeSession();
    const questions = [makeQuestion({ correct_answer: 'B' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(mockSaveAnswer).toHaveBeenCalled();
    expect(mockAdvanceOrComplete).toHaveBeenCalledWith(
      'user-1',
      session,
      questions,
      expect.anything() // dmChannel
    );
  });

  it('disables buttons — editReply called with { components: [] }', async () => {
    const session = makeSession();
    const questions = [makeQuestion({ correct_answer: 'B' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({ components: [] });
  });

  it('Inactive session guard (completed) — followUp with error, saveAnswer NOT called', async () => {
    const session = makeSession({ status: 'completed' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true })
    );
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('Inactive session guard (null) — followUp with error, saveAnswer NOT called', async () => {
    mockGetQuizSession.mockResolvedValueOnce(null);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(interaction.followUp).toHaveBeenCalled();
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('Parses sessionId and choice correctly from customId with hyphenated sessionId', async () => {
    const session = makeSession({ id: 'my-session-abc', quiz_id: 'quiz-1' });
    const questions = [makeQuestion({ id: 'q-1', correct_answer: 'C' })];
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const interaction = makeButtonInteraction('quiz_answer_my-session-abc_C');

    await invokeAndWait(interaction);

    expect(mockGetQuizSession).toHaveBeenCalledWith('my-session-abc');
    expect(mockSaveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ student_answer: 'C' })
    );
  });

  it('rejects when Discord user is not the session owner', async () => {
    const session = makeSession({ student_id: 'other-student' });
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetStudentByDiscordId.mockResolvedValueOnce({ id: 'student-1' });
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Этот квиз вам не назначен.', ephemeral: true })
    );
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('rejects when student not found in DB', async () => {
    const session = makeSession();
    mockGetQuizSession.mockResolvedValueOnce(session);
    mockGetStudentByDiscordId.mockResolvedValueOnce(null);
    const interaction = makeButtonInteraction('quiz_answer_session-1_B');

    await invokeAndWait(interaction);

    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true })
    );
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });
});
