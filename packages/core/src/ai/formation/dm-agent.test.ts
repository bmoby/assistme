import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Anthropic SDK - MUST use 'default' key for ESM default import
// vi.hoisted ensures these are available at mock factory evaluation time
// MockAnthropic must use 'function' syntax (not arrow) to be a valid constructor
const { mockCreate, MockAnthropic } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(function () {
    return { messages: { create: mockCreate } };
  });
  return { mockCreate, MockAnthropic };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic,
}));

// Mock all DB functions the agent calls
vi.mock('../../db/formation/index.js');
vi.mock('../../db/formation/exercises.js');
vi.mock('../../db/formation/attachments.js');
vi.mock('./exercise-reviewer.js');
vi.mock('../embeddings.js');
vi.mock('../../db/client.js', () => ({
  getSupabase: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}));
vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { runDmAgent } from './dm-agent.js';
import type { DmAgentContext } from './dm-agent.js';
import {
  getStudentByDiscordId,
  getExercisesByStudent,
  getPublishedSessions,
  searchFormationKnowledge,
} from '../../db/formation/index.js';
import { submitExercise } from '../../db/formation/exercises.js';
import { getEmbedding } from '../embeddings.js';

// ============================================
// Fixture helpers (inline — test independence)
// ============================================

function makeToolUseResponse(toolName: string, toolInput: Record<string, unknown>) {
  return {
    id: 'msg_tool_use',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'tool_use', id: `call_${toolName}`, name: toolName, input: toolInput }],
    stop_reason: 'tool_use',
    stop_sequence: null,
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

function makeTextResponse(text: string) {
  return {
    id: 'msg_final',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 200, output_tokens: 80 },
  };
}

const MOCK_STUDENT = {
  id: 'student-1',
  name: 'Тест Студент',
  discord_id: 'discord-123',
  session: 2,
  status: 'active' as const,
  payment_status: 'paid' as const,
  phone: null,
  email: null,
  telegram_id: null,
  pod_id: null,
  mentor_id: null,
  enrolled_at: null,
  completed_at: null,
  notes: null,
  payment_amount: null,
  payment_method: null,
  payment_details: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const MOCK_SESSIONS = [
  {
    id: 'session-1',
    session_number: 1,
    module: 1,
    title: 'Введение в ИИ',
    status: 'published' as const,
    deadline: null,
    description: null,
    exercise_title: null,
    exercise_description: null,
    expected_deliverables: null,
    exercise_tips: null,
    video_url: null,
    live_at: null,
    live_url: null,
    discord_thread_id: null,
    pre_session_video_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const BASE_CONTEXT: DmAgentContext = {
  discordUserId: 'discord-123',
  messages: [{ role: 'user', content: 'Привет' }],
  pendingAttachments: [],
};

// ============================================
// Tests
// ============================================

describe('DM Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore MockAnthropic constructor implementation after clearAllMocks()
    // (clearAllMocks clears implementations, so we need to restore it)
    // Must use 'function' syntax to be a valid constructor (not arrow function)
    MockAnthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    });
    // Default: student is found
    vi.mocked(getStudentByDiscordId).mockResolvedValue(MOCK_STUDENT);
    vi.mocked(getExercisesByStudent).mockResolvedValue([]);
    vi.mocked(getPublishedSessions).mockResolvedValue(MOCK_SESSIONS);
    vi.mocked(getEmbedding).mockResolvedValue(new Array(384).fill(0));
    vi.mocked(searchFormationKnowledge).mockResolvedValue([]);
  });

  it('returns "not found" message when student is not in DB', async () => {
    vi.mocked(getStudentByDiscordId).mockResolvedValue(null);

    const result = await runDmAgent(BASE_CONTEXT);

    expect(result.text).toContain('не нашёл тебя');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns text response when Claude responds with end_turn directly', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('Привет! Чем могу помочь?'));

    const result = await runDmAgent(BASE_CONTEXT);

    expect(result.text).toBe('Привет! Чем могу помочь?');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.submissionId).toBeUndefined();
  });

  it('routes get_student_progress tool call to getExercisesByStudent and getPublishedSessions', async () => {
    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('get_student_progress', {}))
      .mockResolvedValueOnce(makeTextResponse('Вот твой прогресс: 0 из 1 заданий сдано.'));

    const result = await runDmAgent(BASE_CONTEXT);

    expect(getExercisesByStudent).toHaveBeenCalledWith('student-1');
    expect(getPublishedSessions).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('Вот твой прогресс: 0 из 1 заданий сдано.');
  });

  it('routes create_submission tool call and returns submissionId', async () => {
    const mockExercise = {
      id: 'exercise-1',
      student_id: 'student-1',
      module: 1,
      exercise_number: 1,
      submission_url: null,
      submission_type: 'text',
      submitted_at: '2024-01-01T00:00:00Z',
      ai_review: null,
      manual_review: null,
      status: 'submitted' as const,
      reviewed_at: null,
      feedback: null,
      session_id: 'session-1',
      submission_count: 1,
      review_history: [],
      notification_message_id: null,
      created_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(submitExercise).mockResolvedValue(mockExercise);

    // Mock getSessionByNumber through index mock
    const { getSessionByNumber } = await import('../../db/formation/index.js');
    vi.mocked(getSessionByNumber).mockResolvedValue(MOCK_SESSIONS[0]!);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('create_submission', { session_number: 1, student_comment: 'Готово' }))
      .mockResolvedValueOnce(makeTextResponse('Задание принято!'));

    const result = await runDmAgent(BASE_CONTEXT);

    expect(submitExercise).toHaveBeenCalled();
    expect(result.submissionId).toBe('exercise-1');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('Задание принято!');
  });

  it('routes search_course_content tool call to searchFormationKnowledge', async () => {
    vi.mocked(searchFormationKnowledge).mockResolvedValue([
      {
        id: 'k-1',
        title: 'Что такое переменная',
        content: 'Переменная — это контейнер для данных...',
        module: 1,
        session_number: 1,
        content_type: 'lesson',
        final_score: 0.85,
      },
    ]);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('search_course_content', { query: 'что такое переменная' }))
      .mockResolvedValueOnce(makeTextResponse('Переменная — это контейнер для данных.'));

    const result = await runDmAgent(BASE_CONTEXT);

    expect(getEmbedding).toHaveBeenCalledWith('что такое переменная');
    expect(searchFormationKnowledge).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toContain('Переменная');
  });

  it('respects maximum iteration limit of 5', async () => {
    // Always returns tool_use — never end_turn
    mockCreate.mockResolvedValue(makeToolUseResponse('get_student_progress', {}));

    const result = await runDmAgent(BASE_CONTEXT);

    // Should stop after maxIterations (5) and return fallback text
    expect(mockCreate).toHaveBeenCalledTimes(5);
    // The final response content has no text blocks (only tool_use), so fallback text is used
    expect(result.text).toBeTruthy();
  });

  it('handles tool execution error gracefully (continues loop after error tool_result)', async () => {
    // getExercisesByStudent throws on first tool call
    vi.mocked(getExercisesByStudent).mockRejectedValue(new Error('DB timeout'));

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('get_student_progress', {}))
      .mockResolvedValueOnce(makeTextResponse('Произошла ошибка, но продолжаем.'));

    const result = await runDmAgent(BASE_CONTEXT);

    // Agent should send tool_result with error content, then get final text
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('Произошла ошибка, но продолжаем.');
  });

  it('passes full conversation history to Claude API', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('Продолжаем разговор.'));

    const context: DmAgentContext = {
      discordUserId: 'discord-123',
      messages: [
        { role: 'user', content: 'msg1' },
        { role: 'assistant', content: 'resp1' },
        { role: 'user', content: 'msg2' },
      ],
      pendingAttachments: [],
    };

    await runDmAgent(context);

    const firstCallArgs = mockCreate.mock.calls[0]![0] as { messages: Array<{ role: string; content: string }> };
    expect(firstCallArgs.messages).toHaveLength(3);
    expect(firstCallArgs.messages[0]!.content).toBe('msg1');
    expect(firstCallArgs.messages[1]!.content).toBe('resp1');
    expect(firstCallArgs.messages[2]!.content).toBe('msg2');
  });

  it('appends attachment info to last user message when newAttachmentsInfo is set', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('Файл получен.'));

    const context: DmAgentContext = {
      discordUserId: 'discord-123',
      messages: [{ role: 'user', content: 'Вот мой файл' }],
      pendingAttachments: [
        {
          buffer: null,
          url: 'https://cdn.example.com/file.png',
          originalFilename: 'file.png',
          mimeType: 'image/png',
          type: 'file',
          fileSize: 1024,
        },
      ],
      newAttachmentsInfo: '1 файл прикреплён: file.png',
    };

    await runDmAgent(context);

    const firstCallArgs = mockCreate.mock.calls[0]![0] as { messages: Array<{ role: string; content: string }> };
    const lastMessage = firstCallArgs.messages[firstCallArgs.messages.length - 1]!;
    expect(lastMessage.content).toContain('file.png');
    expect(lastMessage.content).toContain('[Система:');
  });

  it('handles get_pending_feedback tool call', async () => {
    vi.mocked(getExercisesByStudent).mockResolvedValue([
      {
        id: 'ex-1',
        student_id: 'student-1',
        module: 1,
        exercise_number: 1,
        submission_url: null,
        submission_type: 'text',
        submitted_at: '2024-01-01T00:00:00Z',
        ai_review: { score: 85, summary: 'Good work' },
        manual_review: null,
        status: 'ai_reviewed',
        reviewed_at: null,
        feedback: 'Отличная работа!',
        session_id: null,
        submission_count: 1,
        review_history: [],
        notification_message_id: null,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('get_pending_feedback', {}))
      .mockResolvedValueOnce(makeTextResponse('У тебя есть отзыв по заданию.'));

    const result = await runDmAgent(BASE_CONTEXT);

    expect(getExercisesByStudent).toHaveBeenCalledWith('student-1');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toBe('У тебя есть отзыв по заданию.');
  });
});
