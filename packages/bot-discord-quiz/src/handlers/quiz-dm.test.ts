import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Message } from 'discord.js';
import type { StudentQuizSession, QuizQuestion } from '@assistme/core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const {
  mockGetStudentByDiscordId,
  mockGetActiveSessionByStudent,
  mockGetQuestionsByQuiz,
  mockSaveAnswer,
  mockLogger,
  mockSendQuestion,
  mockAdvanceOrComplete,
  mockEvaluateOpenAnswer,
} = vi.hoisted(() => ({
  mockGetStudentByDiscordId: vi.fn(),
  mockGetActiveSessionByStudent: vi.fn(),
  mockGetQuestionsByQuiz: vi.fn(),
  mockSaveAnswer: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  mockSendQuestion: vi.fn(),
  mockAdvanceOrComplete: vi.fn(),
  mockEvaluateOpenAnswer: vi.fn(),
}));

vi.mock('@assistme/core', () => ({
  getStudentByDiscordId: mockGetStudentByDiscordId,
  getActiveSessionByStudent: mockGetActiveSessionByStudent,
  getQuestionsByQuiz: mockGetQuestionsByQuiz,
  saveAnswer: mockSaveAnswer,
  logger: mockLogger,
}));

vi.mock('../utils/quiz-flow.js', () => ({
  sendQuestion: mockSendQuestion,
  advanceOrComplete: mockAdvanceOrComplete,
}));

vi.mock('../utils/quiz-eval.js', () => ({
  evaluateOpenAnswer: mockEvaluateOpenAnswer,
}));

import { handleQuizDm, _clearStateForTesting, _getAwaitingOpenAnswer } from './quiz-dm.js';

// ---------------------------------------------------------------------------
// Helper: wait for the per-user lock to drain after handleQuizDm fires
// handleQuizDm uses a fire-and-forget lock chain — we flush microtasks by waiting
// for the processingLocks entry to be cleared in the finally() callback.
// ---------------------------------------------------------------------------
async function invokeAndWait(msg: Message, userId = 'user-1'): Promise<void> {
  await handleQuizDm(msg);
  // The lock is a Promise set on processingLocks map.
  // After handleQuizDm returns, the lock promise is still settling.
  // We flush all pending microtasks by awaiting a resolved promise repeatedly.
  // In practice 2 rounds covers: Promise.resolve().then(processQuizDm).finally(cleanup)
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  // Extra: yield to let any awaited async operations resolve
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeStudent() {
  return { id: 'student-1', discord_id: 'user-1', name: 'Иван Иванов' };
}

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

function makeDmMessage(content: string, authorId = 'user-1') {
  const channelSend = vi.fn().mockResolvedValue(undefined);
  return {
    content,
    author: { id: authorId, bot: false },
    guild: null,
    channel: { send: channelSend },
    reply: vi.fn().mockResolvedValue(undefined),
    _channelSend: channelSend,
  } as unknown as Message & { _channelSend: ReturnType<typeof vi.fn> };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleQuizDm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearStateForTesting();
    mockSaveAnswer.mockResolvedValue(undefined);
    mockSendQuestion.mockResolvedValue(undefined);
    mockAdvanceOrComplete.mockResolvedValue(null);
  });

  it('Not a student — getStudentByDiscordId returns null, no further calls', async () => {
    mockGetStudentByDiscordId.mockResolvedValueOnce(null);
    const msg = makeDmMessage('hello');

    await invokeAndWait(msg);

    expect(mockGetStudentByDiscordId).toHaveBeenCalledWith('user-1');
    expect(mockGetActiveSessionByStudent).not.toHaveBeenCalled();
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('No active session — getActiveSessionByStudent returns null, no further calls', async () => {
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(null);
    const msg = makeDmMessage('hello');

    await invokeAndWait(msg);

    expect(mockGetActiveSessionByStudent).toHaveBeenCalledWith('student-1');
    expect(mockGetQuestionsByQuiz).not.toHaveBeenCalled();
  });

  it('not_started status ignored — student should click Начать', async () => {
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(makeSession({ status: 'not_started' }));
    const msg = makeDmMessage('hello');

    await invokeAndWait(msg);

    expect(mockGetQuestionsByQuiz).not.toHaveBeenCalled();
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('D-16: Resume triggered by any DM — getActiveSessionByStudent is always called', async () => {
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(
      makeSession({ status: 'in_progress', current_question: 2 })
    );
    const questions = [
      makeQuestion({ id: 'q-1', question_number: 1 }),
      makeQuestion({ id: 'q-2', question_number: 2 }),
      makeQuestion({ id: 'q-3', question_number: 3, type: 'open' }),
    ];
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    const msg = makeDmMessage('just a message');

    await invokeAndWait(msg);

    expect(mockGetActiveSessionByStudent).toHaveBeenCalled();
  });

  it('Button question text guard — current question is MCQ, sends "кнопок выше"', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 0 });
    const questions = [makeQuestion({ id: 'q-1', type: 'mcq' })];
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    // awaitingOpenAnswer is NOT set for this question
    const msg = makeDmMessage('I think the answer is B');

    await invokeAndWait(msg);

    const channelSend = (msg as ReturnType<typeof makeDmMessage>)._channelSend;
    expect(channelSend).toHaveBeenCalledWith(expect.stringContaining('кнопок выше'));
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('QUIZ-07: Resume — open question, awaitingOpenAnswer not set → sends recap with "остановились", calls sendQuestion', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 1 });
    const questions = [
      makeQuestion({ id: 'q-1', question_number: 1, type: 'mcq' }),
      makeQuestion({ id: 'q-2', question_number: 2, type: 'open' }),
    ];
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    // awaitingOpenAnswer NOT set — resume path
    const msg = makeDmMessage('I am back');

    await invokeAndWait(msg);

    const channelSend = (msg as ReturnType<typeof makeDmMessage>)._channelSend;
    expect(channelSend).toHaveBeenCalledWith(expect.stringContaining('остановились'));
    expect(mockSendQuestion).toHaveBeenCalledWith(
      expect.anything(),
      session,
      questions[1],
      2
    );
    expect(mockSaveAnswer).not.toHaveBeenCalled();
  });

  it('QUIZ-04: Open answer accepted — evaluateOpenAnswer called, saveAnswer called with student_answer', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 0 });
    const openQ = makeQuestion({ id: 'q-open', type: 'open' });
    const questions = [openQ];
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    mockEvaluateOpenAnswer.mockResolvedValueOnce({ isCorrect: true, reasoning: 'Good' });

    // Set awaitingOpenAnswer state
    _getAwaitingOpenAnswer().set('user-1', 'q-open');

    const msg = makeDmMessage('my open answer');

    await invokeAndWait(msg);

    expect(mockEvaluateOpenAnswer).toHaveBeenCalledWith(openQ, 'my open answer');
    expect(mockSaveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ student_answer: 'my open answer', session_id: 'session-1' })
    );
  });

  it('EVAL-03: AI evaluation called with question and studentAnswer', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 0 });
    const openQ = makeQuestion({ id: 'q-open', type: 'open', question_text: 'What is AI?' });
    const questions = [openQ];
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    mockEvaluateOpenAnswer.mockResolvedValueOnce({ isCorrect: false, reasoning: 'Off topic' });

    _getAwaitingOpenAnswer().set('user-1', 'q-open');
    const msg = makeDmMessage('artificial intelligence');

    await invokeAndWait(msg);

    expect(mockEvaluateOpenAnswer).toHaveBeenCalledWith(openQ, 'artificial intelligence');
  });

  it('EVAL-04: AI result stored — saveAnswer called with ai_evaluation field matching evalResult', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 0 });
    const openQ = makeQuestion({ id: 'q-open', type: 'open' });
    const questions = [openQ];
    const evalResult = { isCorrect: true, reasoning: 'Correct semantically' };
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    mockEvaluateOpenAnswer.mockResolvedValueOnce(evalResult);

    _getAwaitingOpenAnswer().set('user-1', 'q-open');
    const msg = makeDmMessage('my open answer');

    await invokeAndWait(msg);

    expect(mockSaveAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_evaluation: evalResult,
      })
    );
  });

  it('D-14: No confirmation step — message sent and answer saved in single pass', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 0 });
    const openQ = makeQuestion({ id: 'q-open', type: 'open' });
    const questions = [openQ];
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    mockEvaluateOpenAnswer.mockResolvedValueOnce({ isCorrect: true, reasoning: 'OK' });

    _getAwaitingOpenAnswer().set('user-1', 'q-open');
    const msg = makeDmMessage('my answer');

    await invokeAndWait(msg);

    // reply is called once (acceptance confirmation), saveAnswer was also called
    expect(msg.reply).toHaveBeenCalledWith('Ответ принят!');
    expect(mockSaveAnswer).toHaveBeenCalledTimes(1);
  });

  it('QUIZ-06: advanceOrComplete called after saving open answer', async () => {
    const session = makeSession({ status: 'in_progress', current_question: 0 });
    const openQ = makeQuestion({ id: 'q-open', type: 'open' });
    const questions = [openQ];
    mockGetStudentByDiscordId.mockResolvedValueOnce(makeStudent());
    mockGetActiveSessionByStudent.mockResolvedValueOnce(session);
    mockGetQuestionsByQuiz.mockResolvedValueOnce(questions);
    mockEvaluateOpenAnswer.mockResolvedValueOnce({ isCorrect: true, reasoning: 'OK' });
    mockAdvanceOrComplete.mockResolvedValueOnce(null); // null = quiz complete

    _getAwaitingOpenAnswer().set('user-1', 'q-open');
    const msg = makeDmMessage('final answer');

    await invokeAndWait(msg);

    expect(mockAdvanceOrComplete).toHaveBeenCalledWith(
      'user-1',
      session,
      questions,
      expect.anything()
    );
  });
});
