import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuizQuestion, StudentQuizAnswer } from '@assistme/core';

// ---------------------------------------------------------------------------
// Mock discord.js using vi.hoisted to track calls across instances
// ---------------------------------------------------------------------------

const { mockSetTitle, mockSetDescription, mockSetColor, mockSetFooter, mockAddFields,
        mockSetCustomId, mockSetLabel, mockSetStyle, mockAddComponents } = vi.hoisted(() => ({
  mockSetTitle: vi.fn(),
  mockSetDescription: vi.fn(),
  mockSetColor: vi.fn(),
  mockSetFooter: vi.fn(),
  mockAddFields: vi.fn(),
  mockSetCustomId: vi.fn(),
  mockSetLabel: vi.fn(),
  mockSetStyle: vi.fn(),
  mockAddComponents: vi.fn(),
}));

vi.mock('discord.js', () => {
  // EmbedBuilder: chainable mock class
  class EmbedBuilder {
    setTitle(v: string) { mockSetTitle(v); return this; }
    setDescription(v: string) { mockSetDescription(v); return this; }
    setColor(v: number) { mockSetColor(v); return this; }
    setFooter(v: object) { mockSetFooter(v); return this; }
    addFields(v: object) { mockAddFields(v); return this; }
  }

  // ButtonBuilder: chainable mock class
  class ButtonBuilder {
    setCustomId(v: string) { mockSetCustomId(v); return this; }
    setLabel(v: string) { mockSetLabel(v); return this; }
    setStyle(v: unknown) { mockSetStyle(v); return this; }
  }

  // ActionRowBuilder: chainable mock class
  class ActionRowBuilder {
    addComponents(...args: unknown[]) { mockAddComponents(...args); return this; }
  }

  return {
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle: { Primary: 'Primary', Success: 'Success', Danger: 'Danger' },
  };
});

import {
  buildQuestionEmbed,
  buildMcqRow,
  buildTrueFalseRow,
  buildOpenQuestionEmbed,
  buildFeedbackMessage,
} from './quiz-messages.js';

// ---------------------------------------------------------------------------
// Local fixture helpers
// ---------------------------------------------------------------------------

function makeQuestion(overrides?: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: 'q-1',
    quiz_id: 'quiz-1',
    question_number: 1,
    type: 'mcq',
    question_text: 'What is 2+2?',
    choices: { A: 'Three', B: 'Four', C: 'Five', D: 'Six' },
    correct_answer: 'B',
    explanation: 'Basic math',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAnswer(overrides?: Partial<StudentQuizAnswer>): StudentQuizAnswer {
  return {
    id: 'ans-1',
    session_id: 's-1',
    question_id: 'q-1',
    student_answer: 'B',
    is_correct: true,
    ai_evaluation: null,
    answered_at: '2026-01-01T00:01:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildQuestionEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets title to "Вопрос N/Total"', () => {
    buildQuestionEmbed(makeQuestion(), 1, 5);
    expect(mockSetTitle).toHaveBeenCalledWith('Вопрос 1/5');
  });

  it('sets description to question_text', () => {
    const q = makeQuestion({ question_text: 'What is TypeScript?' });
    buildQuestionEmbed(q, 2, 10);
    expect(mockSetDescription).toHaveBeenCalledWith('What is TypeScript?');
  });

  it('sets footer with "Выбор ответа" for mcq type', () => {
    buildQuestionEmbed(makeQuestion({ type: 'mcq' }), 1, 5);
    expect(mockSetFooter).toHaveBeenCalledWith({ text: 'Выбор ответа' });
  });

  it('sets footer with "Правда/Ложь" for true_false type', () => {
    buildQuestionEmbed(makeQuestion({ type: 'true_false' }), 1, 5);
    expect(mockSetFooter).toHaveBeenCalledWith({ text: 'Правда/Ложь' });
  });

  it('sets footer with "Открытый вопрос" for open type', () => {
    buildQuestionEmbed(makeQuestion({ type: 'open' }), 1, 5);
    expect(mockSetFooter).toHaveBeenCalledWith({ text: 'Открытый вопрос' });
  });

  it('sets color 0x5865f2', () => {
    buildQuestionEmbed(makeQuestion(), 1, 5);
    expect(mockSetColor).toHaveBeenCalledWith(0x5865f2);
  });
});

describe('buildMcqRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates buttons with customIds quiz_answer_{sessionId}_{key}', () => {
    buildMcqRow('session-1', { A: 'Three', B: 'Four', C: 'Five', D: 'Six' });
    const calls = mockSetCustomId.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain('quiz_answer_session-1_A');
    expect(calls).toContain('quiz_answer_session-1_B');
    expect(calls).toContain('quiz_answer_session-1_C');
    expect(calls).toContain('quiz_answer_session-1_D');
  });

  it('creates 4 buttons for 4 choices', () => {
    buildMcqRow('session-1', { A: 'Three', B: 'Four', C: 'Five', D: 'Six' });
    expect(mockSetCustomId).toHaveBeenCalledTimes(4);
  });

  it('sorts buttons alphabetically (A, B, C, D order)', () => {
    buildMcqRow('session-1', { D: 'Six', B: 'Four', A: 'Three', C: 'Five' });
    const calls = mockSetCustomId.mock.calls.map((c) => c[0] as string);
    const keys = calls.map((id) => id.split('_').pop());
    expect(keys).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('buildTrueFalseRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates "Правда" button with customId quiz_answer_{sessionId}_true', () => {
    buildTrueFalseRow('sess-1');
    const calls = mockSetCustomId.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain('quiz_answer_sess-1_true');
  });

  it('creates "Ложь" button with customId quiz_answer_{sessionId}_false', () => {
    buildTrueFalseRow('sess-1');
    const calls = mockSetCustomId.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain('quiz_answer_sess-1_false');
  });

  it('creates exactly 2 buttons', () => {
    buildTrueFalseRow('sess-1');
    expect(mockSetCustomId).toHaveBeenCalledTimes(2);
  });
});

describe('buildOpenQuestionEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes a field with value "Напишите ваш ответ в чат"', () => {
    buildOpenQuestionEmbed(makeQuestion({ type: 'open' }), 1, 5);
    expect(mockAddFields).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'Напишите ваш ответ в чат' })
    );
  });

  it('sets title Вопрос N/Total (delegates to buildQuestionEmbed)', () => {
    buildOpenQuestionEmbed(makeQuestion({ type: 'open' }), 3, 7);
    expect(mockSetTitle).toHaveBeenCalledWith('Вопрос 3/7');
  });
});

describe('buildFeedbackMessage', () => {
  it('score header format: "Результат: 2/3 (67%)"', () => {
    const questions = [
      makeQuestion({ id: 'q-1', question_number: 1 }),
      makeQuestion({ id: 'q-2', question_number: 2 }),
      makeQuestion({ id: 'q-3', question_number: 3 }),
    ];
    const answers = [
      makeAnswer({ question_id: 'q-1', is_correct: true }),
      makeAnswer({ id: 'ans-2', question_id: 'q-2', is_correct: true }),
      makeAnswer({ id: 'ans-3', question_id: 'q-3', is_correct: false }),
    ];
    const result = buildFeedbackMessage(answers, questions, 66.67);
    expect(result).toContain('Результат: 2/3 (67%)');
  });

  it('all correct: shows checkmarks, no explanations shown for correct answers (D-22)', () => {
    const q = makeQuestion({ id: 'q-1', explanation: 'My explanation' });
    const ans = makeAnswer({ question_id: 'q-1', is_correct: true, student_answer: 'B' });
    const result = buildFeedbackMessage([ans], [q], 100);
    expect(result).toContain('✅');
    // explanation should NOT appear for correct answers
    expect(result).not.toContain('My explanation');
  });

  it('incorrect answers show explanation', () => {
    const q = makeQuestion({ id: 'q-1', explanation: 'Because math' });
    const ans = makeAnswer({ question_id: 'q-1', is_correct: false, student_answer: 'A' });
    const result = buildFeedbackMessage([ans], [q], 0);
    expect(result).toContain('❌');
    expect(result).toContain('Because math');
  });

  it('shows "пропущен" for missing answer', () => {
    const q = makeQuestion({ id: 'q-missing', question_number: 2 });
    const result = buildFeedbackMessage([], [q], 0);
    expect(result).toContain('пропущен');
  });

  it('returns result <= 2000 chars for long messages (D-23)', () => {
    // Create many questions with long explanations to force truncation
    const questions: QuizQuestion[] = Array.from({ length: 30 }, (_, i) =>
      makeQuestion({
        id: `q-${i}`,
        question_number: i + 1,
        explanation: 'A very long explanation that fills up space. '.repeat(3),
      })
    );
    const answers: StudentQuizAnswer[] = questions.map((q, i) =>
      makeAnswer({
        id: `ans-${i}`,
        question_id: q.id,
        is_correct: false,
        student_answer: 'wrong',
      })
    );
    const result = buildFeedbackMessage(answers, questions, 0);
    expect(result.length).toBeLessThanOrEqual(2000);
  });

  it('mix: incorrect answers show correct answer, correct do not', () => {
    const questions = [
      makeQuestion({ id: 'q-1', question_number: 1, correct_answer: 'B' }),
      makeQuestion({ id: 'q-2', question_number: 2, correct_answer: 'true' }),
    ];
    const answers = [
      makeAnswer({ question_id: 'q-1', is_correct: true, student_answer: 'B' }),
      makeAnswer({ id: 'ans-2', question_id: 'q-2', is_correct: false, student_answer: 'false' }),
    ];
    const result = buildFeedbackMessage(answers, questions, 50);
    expect(result).toContain('✅');
    expect(result).toContain('❌');
    expect(result).toContain('Правильно: true');
  });

  it('100% score shows correct percentage format', () => {
    const q = makeQuestion();
    const ans = makeAnswer({ question_id: 'q-1', is_correct: true });
    const result = buildFeedbackMessage([ans], [q], 100);
    expect(result).toContain('Результат: 1/1 (100%)');
  });
});
