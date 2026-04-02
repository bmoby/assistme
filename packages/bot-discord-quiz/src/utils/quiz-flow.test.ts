import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StudentQuizSession, QuizQuestion, StudentQuizAnswer } from '@assistme/core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockUpdateQuizSession,
  mockGetAnswersBySession,
  mockLogger,
  mockBuildQuestionEmbed,
  mockBuildMcqRow,
  mockBuildTrueFalseRow,
  mockBuildOpenQuestionEmbed,
  mockBuildFeedbackMessages,
} = vi.hoisted(() => ({
  mockUpdateQuizSession: vi.fn(),
  mockGetAnswersBySession: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  mockBuildQuestionEmbed: vi.fn().mockReturnValue('question-embed'),
  mockBuildMcqRow: vi.fn().mockReturnValue('mcq-row'),
  mockBuildTrueFalseRow: vi.fn().mockReturnValue('tf-row'),
  mockBuildOpenQuestionEmbed: vi.fn().mockReturnValue('open-question-embed'),
  mockBuildFeedbackMessages: vi.fn().mockReturnValue(['feedback-msg']),
}));

vi.mock('@assistme/core', () => ({
  updateQuizSession: mockUpdateQuizSession,
  getAnswersBySession: mockGetAnswersBySession,
  logger: mockLogger,
}));

vi.mock('./quiz-messages.js', () => ({
  buildMcqRow: mockBuildMcqRow,
  buildTrueFalseRow: mockBuildTrueFalseRow,
  buildFeedbackMessages: mockBuildFeedbackMessages,
}));

import { sendQuestion, advanceOrComplete } from './quiz-flow.js';

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

function makeAnswer(overrides?: Partial<StudentQuizAnswer>): StudentQuizAnswer {
  return {
    id: 'ans-1',
    session_id: 'session-1',
    question_id: 'q-1',
    student_answer: 'B',
    is_correct: true,
    ai_evaluation: null,
    answered_at: '2026-01-01T00:01:00Z',
    ...overrides,
  };
}

function makeDmChannel() {
  return { send: vi.fn().mockResolvedValue(undefined) } as unknown as Parameters<typeof sendQuestion>[0];
}

// ---------------------------------------------------------------------------
// Tests: sendQuestion
// ---------------------------------------------------------------------------

describe('sendQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends MCQ question with plain text and button row, no embeds', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 0 });
    const question = makeQuestion({ type: 'mcq', choices: { A: 'Yes', B: 'No' } });

    await sendQuestion(dmChannel, session, question, 5);

    expect(mockBuildMcqRow).toHaveBeenCalledWith('session-1', question.choices);
    const sentMsg = (dmChannel.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(sentMsg.embeds).toBeUndefined();
    expect(sentMsg.components).toEqual(['mcq-row']);
    expect(sentMsg.content).toContain('Вопрос 1/5');
    expect(sentMsg.content).toContain('What is 2+2?');
    expect(sentMsg.content).toContain('A.');
    expect(sentMsg.content).toContain('B.');
  });

  it('sends true_false question with plain text and VF button row', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 2 });
    const question = makeQuestion({ type: 'true_false', choices: null });

    await sendQuestion(dmChannel, session, question, 10);

    expect(mockBuildTrueFalseRow).toHaveBeenCalledWith('session-1');
    const sentMsg = (dmChannel.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(sentMsg.embeds).toBeUndefined();
    expect(sentMsg.content).toContain('Вопрос 3/10');
    expect(sentMsg.content).toContain(question.question_text);
  });

  it('sends open question with plain text, no embeds, no components', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 4 });
    const question = makeQuestion({ type: 'open', choices: null });

    await sendQuestion(dmChannel, session, question, 7);

    const sentMsg = (dmChannel.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(sentMsg.embeds).toBeUndefined();
    expect(sentMsg.components).toBeUndefined();
    expect(sentMsg.content).toContain('Вопрос 5/7');
    expect(sentMsg.content).toContain('Напишите ваш ответ');
    expect(mockBuildMcqRow).not.toHaveBeenCalled();
    expect(mockBuildTrueFalseRow).not.toHaveBeenCalled();
  });

  it('uses displayNumber = current_question + 1', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 9 });
    const question = makeQuestion({ type: 'mcq' });

    await sendQuestion(dmChannel, session, question, 15);

    const sentContent = (dmChannel.send as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.content as string;
    expect(sentContent).toContain('Вопрос 10/15');
  });
});

// ---------------------------------------------------------------------------
// Tests: advanceOrComplete
// ---------------------------------------------------------------------------

describe('advanceOrComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes quiz when last question is reached', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 2 }); // 0-indexed, last of 3
    const questions = [
      makeQuestion({ id: 'q-1' }),
      makeQuestion({ id: 'q-2' }),
      makeQuestion({ id: 'q-3' }),
    ];
    const answers = [
      makeAnswer({ question_id: 'q-1', is_correct: true }),
      makeAnswer({ id: 'a-2', question_id: 'q-2', is_correct: true }),
      makeAnswer({ id: 'a-3', question_id: 'q-3', is_correct: false }),
    ];
    mockGetAnswersBySession.mockResolvedValue(answers);
    mockUpdateQuizSession.mockResolvedValue(undefined);

    const result = await advanceOrComplete('user-1', session, questions, dmChannel);

    expect(result).toBeNull();
    expect(mockUpdateQuizSession).toHaveBeenCalledWith('session-1', expect.objectContaining({
      status: 'completed',
      score: expect.closeTo(66.67, 1),
    }));
    expect(mockBuildFeedbackMessages).toHaveBeenCalledWith(answers, questions, expect.closeTo(66.67, 1));
    expect(dmChannel.send).toHaveBeenCalledWith('feedback-msg');
  });

  it('calculates 100% score when all correct', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 1 });
    const questions = [makeQuestion({ id: 'q-1' }), makeQuestion({ id: 'q-2' })];
    const answers = [
      makeAnswer({ question_id: 'q-1', is_correct: true }),
      makeAnswer({ id: 'a-2', question_id: 'q-2', is_correct: true }),
    ];
    mockGetAnswersBySession.mockResolvedValue(answers);
    mockUpdateQuizSession.mockResolvedValue(undefined);

    await advanceOrComplete('user-1', session, questions, dmChannel);

    expect(mockUpdateQuizSession).toHaveBeenCalledWith('session-1', expect.objectContaining({
      score: 100,
    }));
  });

  it('calculates 0% score when all wrong', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 2 });
    const questions = [
      makeQuestion({ id: 'q-1' }),
      makeQuestion({ id: 'q-2' }),
      makeQuestion({ id: 'q-3' }),
    ];
    const answers = [
      makeAnswer({ question_id: 'q-1', is_correct: false }),
      makeAnswer({ id: 'a-2', question_id: 'q-2', is_correct: false }),
      makeAnswer({ id: 'a-3', question_id: 'q-3', is_correct: false }),
    ];
    mockGetAnswersBySession.mockResolvedValue(answers);
    mockUpdateQuizSession.mockResolvedValue(undefined);

    await advanceOrComplete('user-1', session, questions, dmChannel);

    expect(mockUpdateQuizSession).toHaveBeenCalledWith('session-1', expect.objectContaining({
      score: 0,
    }));
  });

  it('advances to next question when not last', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 0 });
    const questions = [
      makeQuestion({ id: 'q-1', question_number: 1 }),
      makeQuestion({ id: 'q-2', question_number: 2, type: 'true_false' }),
      makeQuestion({ id: 'q-3', question_number: 3 }),
    ];
    const updatedSession = makeSession({ current_question: 1 });
    mockUpdateQuizSession.mockResolvedValue(updatedSession);

    const result = await advanceOrComplete('user-1', session, questions, dmChannel);

    expect(result).toEqual(updatedSession);
    expect(mockUpdateQuizSession).toHaveBeenCalledWith('session-1', { current_question: 1 });
    // Should not call getAnswersBySession (not completing)
    expect(mockGetAnswersBySession).not.toHaveBeenCalled();
  });

  it('logs error and returns null when next question not found', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 0 });
    // questions array has 1 element but nextIndex would be 1
    // However current_question=0, nextIndex=1, and questions has 2 elements but index 1 is undefined
    const questions = [makeQuestion({ id: 'q-1' })];
    // nextIndex = 1, questions.length = 1 → goes to completion branch
    // Actually need nextIndex < questions.length but questions[nextIndex] undefined
    // This requires questions.length > nextIndex but the element is missing
    // Use a sparse array approach:
    const sparseQuestions = [makeQuestion({ id: 'q-1' }), undefined as unknown as QuizQuestion, makeQuestion({ id: 'q-3' })];
    const session2 = makeSession({ current_question: 0 });
    const updatedSession = makeSession({ current_question: 1 });
    mockUpdateQuizSession.mockResolvedValue(updatedSession);

    const result = await advanceOrComplete('user-1', session2, sparseQuestions, dmChannel);

    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ nextIndex: 1 }),
      expect.stringContaining('Next question not found'),
    );
  });

  it('sends multiple feedback messages for long results', async () => {
    const dmChannel = makeDmChannel();
    const session = makeSession({ current_question: 0 });
    const questions = [makeQuestion({ id: 'q-1' })];
    const answers = [makeAnswer({ question_id: 'q-1', is_correct: true })];
    mockGetAnswersBySession.mockResolvedValue(answers);
    mockUpdateQuizSession.mockResolvedValue(undefined);
    mockBuildFeedbackMessages.mockReturnValue(['part-1', 'part-2', 'part-3']);

    await advanceOrComplete('user-1', session, questions, dmChannel);

    expect(dmChannel.send).toHaveBeenCalledTimes(3);
    expect(dmChannel.send).toHaveBeenNthCalledWith(1, 'part-1');
    expect(dmChannel.send).toHaveBeenNthCalledWith(2, 'part-2');
    expect(dmChannel.send).toHaveBeenNthCalledWith(3, 'part-3');
  });
});
