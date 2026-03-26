import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock ../client.js (askClaude) — faq-agent uses askClaude, not Anthropic SDK directly
vi.mock('../client.js', () => ({
  askClaude: vi.fn(),
}));

// Mock embeddings and knowledge search (used for auto-search when formationKnowledge not provided)
vi.mock('../embeddings.js', () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(384).fill(0)),
}));
vi.mock('../../db/formation/knowledge.js', () => ({
  searchFormationKnowledge: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { answerFaqQuestion } from './faq-agent.js';
import type { FaqResponse } from './faq-agent.js';
import { askClaude } from '../client.js';

// ============================================
// Fixtures
// ============================================

const SAMPLE_FAQ_ENTRIES = [
  {
    id: 'faq-1',
    question: 'Что такое ИИ-агент?',
    answer: 'ИИ-агент — это автономная система, способная выполнять задачи с помощью ИИ.',
    category: 'concepts',
    times_used: 5,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'faq-2',
    question: 'Как сдать задание?',
    answer: 'Прикрепи файл в Discord в личном чате с ботом.',
    category: 'process',
    times_used: 3,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
  },
];

const VALID_FAQ_RESPONSE: FaqResponse = {
  confidence: 90,
  answer: 'ИИ-агент — это автономная система, способная выполнять задачи с помощью ИИ.',
  matchedFaqId: 'faq-1',
  suggestAddToFaq: false,
};

const LOW_CONFIDENCE_RESPONSE: FaqResponse = {
  confidence: 30,
  answer: 'Я не уверен в ответе. Лучше спроси тренера.',
  matchedFaqId: null,
  suggestAddToFaq: true,
};

// ============================================
// Tests
// ============================================

describe('answerFaqQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed answer with high confidence when Claude returns valid JSON', async () => {
    vi.mocked(askClaude).mockResolvedValueOnce(JSON.stringify(VALID_FAQ_RESPONSE));

    const result = await answerFaqQuestion({
      question: 'Что такое ИИ-агент?',
      existingFaq: SAMPLE_FAQ_ENTRIES,
      formationKnowledge: 'Контекст курса.',
    });

    expect(result.confidence).toBe(90);
    expect(result.answer).toBe('ИИ-агент — это автономная система, способная выполнять задачи с помощью ИИ.');
    expect(result.matchedFaqId).toBe('faq-1');
    expect(result.suggestAddToFaq).toBe(false);
    expect(askClaude).toHaveBeenCalledOnce();
  });

  it('returns low confidence response when no FAQ match found', async () => {
    vi.mocked(askClaude).mockResolvedValueOnce(JSON.stringify(LOW_CONFIDENCE_RESPONSE));

    const result = await answerFaqQuestion({
      question: 'Как установить Python?',
      existingFaq: SAMPLE_FAQ_ENTRIES,
      formationKnowledge: '',
    });

    expect(result.confidence).toBe(30);
    expect(result.matchedFaqId).toBeNull();
    expect(result.suggestAddToFaq).toBe(true);
  });

  it('handles malformed JSON response gracefully with fallback', async () => {
    vi.mocked(askClaude).mockResolvedValueOnce('Вот ответ на твой вопрос без JSON структуры.');

    const result = await answerFaqQuestion({
      question: 'Что-то непонятное',
      existingFaq: [],
      formationKnowledge: '',
    });

    // Should return fallback response, not throw
    expect(result).toBeDefined();
    expect(result.confidence).toBe(0);
    expect(result.matchedFaqId).toBeNull();
    expect(result.suggestAddToFaq).toBe(false);
    expect(result.answer).toContain('Тренер ответит');
  });

  it('handles JSON wrapped in markdown code blocks', async () => {
    const wrapped = '```json\n' + JSON.stringify(VALID_FAQ_RESPONSE) + '\n```';
    vi.mocked(askClaude).mockResolvedValueOnce(wrapped);

    const result = await answerFaqQuestion({
      question: 'Что такое ИИ-агент?',
      existingFaq: SAMPLE_FAQ_ENTRIES,
      formationKnowledge: 'Контекст.',
    });

    // Should strip markdown and parse correctly
    expect(result.confidence).toBe(90);
    expect(result.matchedFaqId).toBe('faq-1');
  });

  it('passes FAQ entries to Claude in the prompt', async () => {
    vi.mocked(askClaude).mockResolvedValueOnce(JSON.stringify(VALID_FAQ_RESPONSE));

    await answerFaqQuestion({
      question: 'Что такое ИИ-агент?',
      existingFaq: SAMPLE_FAQ_ENTRIES,
      formationKnowledge: 'Контекст курса.',
    });

    expect(askClaude).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(askClaude).mock.calls[0]![0];
    // FAQ entries should be embedded in the systemPrompt
    expect(callArgs.systemPrompt).toContain('faq-1');
    expect(callArgs.systemPrompt).toContain('Что такое ИИ-агент?');
  });

  it('handles Anthropic API error by propagating the error', async () => {
    vi.mocked(askClaude).mockRejectedValueOnce(new Error('Rate limited'));

    await expect(
      answerFaqQuestion({
        question: 'Вопрос',
        existingFaq: [],
        formationKnowledge: '',
      })
    ).rejects.toThrow('Rate limited');
  });

  it('auto-searches formation knowledge when formationKnowledge not provided', async () => {
    const { searchFormationKnowledge } = await import('../../db/formation/knowledge.js');
    const { getEmbedding } = await import('../embeddings.js');

    vi.mocked(getEmbedding).mockResolvedValueOnce(new Array(384).fill(0.1));
    vi.mocked(searchFormationKnowledge).mockResolvedValueOnce([
      {
        id: 'k-1',
        title: 'Введение в ИИ-агентов',
        content: 'ИИ-агент — это программа, способная принимать решения.',
        content_type: 'concept',
        module: 1,
        session_number: null,
        tags: [],
        source_file: 'module-1/session-1.md',
        similarity: 0.85,
        text_rank: 0.8,
        final_score: 0.9,
      },
    ]);

    vi.mocked(askClaude).mockResolvedValueOnce(JSON.stringify(VALID_FAQ_RESPONSE));

    await answerFaqQuestion({
      question: 'Что такое ИИ-агент?',
      existingFaq: [],
      // formationKnowledge omitted — should trigger auto-search
    });

    expect(getEmbedding).toHaveBeenCalledWith('Что такое ИИ-агент?');
    expect(searchFormationKnowledge).toHaveBeenCalledOnce();
  });
});
