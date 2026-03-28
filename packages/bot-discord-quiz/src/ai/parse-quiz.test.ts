import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @assistme/core before imports (hoisted by Vitest)
vi.mock('@assistme/core', () => ({
  askClaude: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { parseQuizFromTxt } from './parse-quiz.js';
import { askClaude } from '@assistme/core';

const mockAskClaude = vi.mocked(askClaude);

// ============================================
// Fixtures
// ============================================

const VALID_3_QUESTIONS = JSON.stringify({
  title: 'Quiz Module 1',
  questions: [
    {
      question_number: 1,
      type: 'mcq',
      question_text: 'What is TypeScript?',
      choices: { A: 'A language', B: 'A framework', C: 'A library', D: 'A tool' },
      correct_answer: 'A',
      explanation: 'TypeScript is a typed superset of JavaScript.',
    },
    {
      question_number: 2,
      type: 'true_false',
      question_text: 'JavaScript is compiled.',
      choices: null,
      correct_answer: 'false',
      explanation: null,
    },
    {
      question_number: 3,
      type: 'open',
      question_text: 'Explain closures in JavaScript.',
      choices: null,
      correct_answer: 'A closure is a function that captures variables from its outer scope.',
      explanation: 'Closures allow inner functions to access outer variables even after the outer function has returned.',
    },
  ],
});

// ============================================
// Tests
// ============================================

describe('parseQuizFromTxt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid JSON with MCQ, true_false, and open questions', async () => {
    mockAskClaude.mockResolvedValue(VALID_3_QUESTIONS);

    const result = await parseQuizFromTxt('Some quiz content', 5);

    expect(result.title).toBe('Quiz Module 1');
    expect(result.questions).toHaveLength(3);
    expect(result.questions.map((q: { type: string }) => q.type)).toEqual(['mcq', 'true_false', 'open']);
    expect(result.questions[0]!.choices).not.toBeNull();
    expect(result.questions[1]!.choices).toBeNull();
  });

  it('extracts JSON when Claude adds preamble text', async () => {
    const withPreamble = `Voici le JSON:\n\n${VALID_3_QUESTIONS}\n\nJ'espere que cela vous aide.`;
    mockAskClaude.mockResolvedValue(withPreamble);

    const result = await parseQuizFromTxt('Some quiz content', 1);

    expect(result.title).toBe('Quiz Module 1');
    expect(result.questions).toHaveLength(3);
  });

  it('throws when Claude returns no JSON', async () => {
    mockAskClaude.mockResolvedValue('Je ne peux pas parser ce fichier car il est vide.');

    await expect(parseQuizFromTxt('empty', 1)).rejects.toThrow('JSON');
  });

  it('throws on invalid JSON (malformed)', async () => {
    mockAskClaude.mockResolvedValue('{title: missing quotes}');

    await expect(parseQuizFromTxt('bad input', 1)).rejects.toThrow();
  });

  it('throws on valid JSON but wrong schema (missing questions)', async () => {
    mockAskClaude.mockResolvedValue('{"title": "Quiz", "questions": []}');

    await expect(parseQuizFromTxt('no questions', 1)).rejects.toThrow();
  });

  it('defaults title to "Quiz Session N" when title is generic "Quiz"', async () => {
    const genericTitle = JSON.stringify({
      title: 'Quiz',
      questions: [
        {
          question_number: 1,
          type: 'mcq',
          question_text: 'Test?',
          choices: { A: 'Yes', B: 'No' },
          correct_answer: 'A',
          explanation: null,
        },
      ],
    });
    mockAskClaude.mockResolvedValue(genericTitle);

    const result = await parseQuizFromTxt('some content', 3);

    expect(result.title).toBe('Quiz Session 3');
  });

  it('handles questions with null explanations', async () => {
    const nullExplanations = JSON.stringify({
      title: 'Quiz Session 7',
      questions: [
        {
          question_number: 1,
          type: 'true_false',
          question_text: 'Node.js is single-threaded.',
          choices: null,
          correct_answer: 'true',
          explanation: null,
        },
        {
          question_number: 2,
          type: 'mcq',
          question_text: 'Which is a runtime?',
          choices: { A: 'Node.js', B: 'CSS' },
          correct_answer: 'A',
          explanation: null,
        },
      ],
    });
    mockAskClaude.mockResolvedValue(nullExplanations);

    const result = await parseQuizFromTxt('quiz with null explanations', 7);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]!.explanation).toBeNull();
    expect(result.questions[1]!.explanation).toBeNull();
  });
});
