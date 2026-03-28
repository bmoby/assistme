import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuizQuestion } from '@assistme/core';

// ---------------------------------------------------------------------------
// Mock @assistme/core — use vi.hoisted so mockAskClaude is available at hoist time
// ---------------------------------------------------------------------------

const { mockAskClaude } = vi.hoisted(() => ({
  mockAskClaude: vi.fn(),
}));

vi.mock('@assistme/core', () => ({
  askClaude: mockAskClaude,
}));

import { evaluateOpenAnswer } from './quiz-eval.js';

// ---------------------------------------------------------------------------
// Local fixture
// ---------------------------------------------------------------------------

function makeQuestion(overrides?: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: 'q-1',
    quiz_id: 'quiz-1',
    question_number: 1,
    type: 'open',
    question_text: 'What is supervised learning?',
    choices: null,
    correct_answer: 'Learning from labeled data',
    explanation: 'Supervised learning uses labeled training examples.',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('evaluateOpenAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls askClaude with model: "sonnet" (D-19)', async () => {
    mockAskClaude.mockResolvedValueOnce('{"isCorrect": true, "reasoning": "good"}');
    await evaluateOpenAnswer(makeQuestion(), 'learning from labeled examples');
    expect(mockAskClaude).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'sonnet' })
    );
  });

  it('returns { isCorrect: true } for correct JSON response', async () => {
    mockAskClaude.mockResolvedValueOnce('{"isCorrect": true, "reasoning": "Correct!"}');
    const result = await evaluateOpenAnswer(makeQuestion(), 'my good answer');
    expect(result.isCorrect).toBe(true);
    expect(result.reasoning).toBe('Correct!');
  });

  it('returns { isCorrect: false } for incorrect JSON response', async () => {
    mockAskClaude.mockResolvedValueOnce('{"isCorrect": false, "reasoning": "Wrong."}');
    const result = await evaluateOpenAnswer(makeQuestion(), 'my wrong answer');
    expect(result.isCorrect).toBe(false);
    expect(result.reasoning).toBe('Wrong.');
  });

  it('falls back to substring match when JSON is malformed (true case)', async () => {
    const q = makeQuestion({ correct_answer: 'labeled data' });
    mockAskClaude.mockResolvedValueOnce('this is not valid json');
    // "labeled data" is in the student answer → isCorrect should be true
    const result = await evaluateOpenAnswer(q, 'I think it involves labeled data and training');
    expect(result.isCorrect).toBe(true);
    expect(result.reasoning).toBe('parsing fallback');
  });

  it('falls back to false when JSON malformed and answer does not contain correct_answer', async () => {
    const q = makeQuestion({ correct_answer: 'labeled data' });
    mockAskClaude.mockResolvedValueOnce('not json');
    const result = await evaluateOpenAnswer(q, 'something completely unrelated');
    expect(result.isCorrect).toBe(false);
    expect(result.reasoning).toBe('parsing fallback');
  });

  it('system prompt contains "семантически" (D-18 semantic matching)', async () => {
    mockAskClaude.mockResolvedValueOnce('{"isCorrect": true, "reasoning": "ok"}');
    await evaluateOpenAnswer(makeQuestion(), 'some answer');
    const call = mockAskClaude.mock.calls[0]?.[0] as { systemPrompt?: string };
    expect(call?.systemPrompt).toContain('семантически');
  });

  it('prompt includes question_text, correct_answer, and studentAnswer', async () => {
    const q = makeQuestion({
      question_text: 'Define overfitting',
      correct_answer: 'Model memorizes training data',
    });
    mockAskClaude.mockResolvedValueOnce('{"isCorrect": false, "reasoning": "partial"}');
    await evaluateOpenAnswer(q, 'student typed this');
    const call = mockAskClaude.mock.calls[0]?.[0] as { prompt?: string };
    expect(call?.prompt).toContain('Define overfitting');
    expect(call?.prompt).toContain('Model memorizes training data');
    expect(call?.prompt).toContain('student typed this');
  });

  it('returns EvalResult shape with isCorrect boolean and reasoning string', async () => {
    mockAskClaude.mockResolvedValueOnce('{"isCorrect": true, "reasoning": "Good answer"}');
    const result = await evaluateOpenAnswer(makeQuestion(), 'answer');
    expect(typeof result.isCorrect).toBe('boolean');
    expect(typeof result.reasoning).toBe('string');
  });
});
