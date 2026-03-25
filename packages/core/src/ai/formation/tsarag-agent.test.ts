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

// Mock all DB modules the agent imports
vi.mock('../../db/formation/index.js');
vi.mock('../../db/formation/exercises.js');
vi.mock('../../db/formation/students.js');
vi.mock('../../google/meet.js', () => ({
  createMeetEvent: vi.fn().mockResolvedValue({ meetUrl: 'https://meet.google.com/test' }),
}));
vi.mock('../../utils/session-forum.js', () => ({
  buildSessionForumContent: vi.fn().mockReturnValue('Forum content'),
  buildSessionAnnouncement: vi.fn().mockReturnValue('Announcement text'),
}));
vi.mock('../embeddings.js', () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(384).fill(0)),
}));
vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { runTsaragAgent } from './tsarag-agent.js';
import type { TsaragAgentContext, PendingAction } from '../../types/index.js';
import {
  getStudentsBySession,
  searchStudentByName,
  getExercisesByStudent,
  searchFormationKnowledge,
} from '../../db/formation/index.js';

// ============================================
// Fixture helpers
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

function makeContext(overrides: Partial<TsaragAgentContext> = {}): TsaragAgentContext {
  return {
    messages: [{ role: 'user', content: 'Покажи список студентов' }],
    discordActions: {
      sendAnnouncement: vi.fn().mockResolvedValue(undefined),
      sendToSessionsForum: vi.fn().mockResolvedValue('thread-1'),
      dmStudent: vi.fn().mockResolvedValue(true),
      archiveForumThread: vi.fn().mockResolvedValue(undefined),
      unarchiveForumThread: vi.fn().mockResolvedValue(undefined),
    },
    pendingAction: null,
    executedActionIds: new Set(),
    ...overrides,
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
};

// ============================================
// Tests
// ============================================

describe('runTsaragAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton client so each test gets a fresh mock
    // (module-level `anthropicClient` is reset via vi.clearAllMocks + fresh MockAnthropic)
  });

  it('returns text response when Claude responds with end_turn directly', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('Привет! Чем могу помочь?'));

    const result = await runTsaragAgent(makeContext({
      messages: [{ role: 'user', content: 'Привет' }],
    }));

    expect(result.text).toContain('Привет');
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.actionsPerformed).toHaveLength(0);
    expect(result.proposedAction).toBeNull();
  });

  it('routes list_students tool call to getStudentsBySession', async () => {
    vi.mocked(getStudentsBySession).mockResolvedValue([MOCK_STUDENT]);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('list_students', {}))
      .mockResolvedValueOnce(makeTextResponse('Вот список студентов: Тест Студент'));

    const result = await runTsaragAgent(makeContext());

    expect(getStudentsBySession).toHaveBeenCalledWith(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toContain('студент');
  });

  it('routes get_student_details tool call to searchStudentByName and getExercisesByStudent', async () => {
    vi.mocked(searchStudentByName).mockResolvedValue([MOCK_STUDENT]);
    vi.mocked(getExercisesByStudent).mockResolvedValue([]);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('get_student_details', { student_name: 'Тест' }))
      .mockResolvedValueOnce(makeTextResponse('Студент найден.'));

    const result = await runTsaragAgent(makeContext({
      messages: [{ role: 'user', content: 'Покажи студента Тест' }],
    }));

    expect(searchStudentByName).toHaveBeenCalledWith('Тест');
    expect(getExercisesByStudent).toHaveBeenCalledWith('student-1');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toBeDefined();
  });

  it('sets proposedAction when propose_action tool is called', async () => {
    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('propose_action', {
        action_type: 'send_announcement',
        params: { text: 'Привет студенты!', mention_students: false },
        summary: 'Envoyer une annonce aux etudiants',
      }))
      .mockResolvedValueOnce(makeTextResponse('Хочешь отправить это объявление? Подтверди.'));

    const result = await runTsaragAgent(makeContext({
      messages: [{ role: 'user', content: 'Отправь объявление: Привет студенты!' }],
    }));

    expect(result.proposedAction).not.toBeNull();
    expect(result.proposedAction!.type).toBe('send_announcement');
    expect(result.proposedAction!.params.text).toBe('Привет студенты!');
    expect(result.proposedAction!.summary).toContain('annonce');
  });

  it('executes pending action when execute_pending is called after confirmation', async () => {
    const pendingAction: PendingAction = {
      type: 'send_announcement',
      params: { text: 'Привет, студенты!', mention_students: false },
      summary: 'Envoyer annonce',
      id: 'action-1',
    };

    const context = makeContext({
      messages: [{ role: 'user', content: 'Да, отправляй' }],
      pendingAction,
      executedActionIds: new Set(),
    });

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('execute_pending', {}))
      .mockResolvedValueOnce(makeTextResponse('Объявление отправлено!'));

    const result = await runTsaragAgent(context);

    expect(context.discordActions.sendAnnouncement).toHaveBeenCalledWith('Привет, студенты!', false);
    expect(result.pendingConsumed).toBe(true);
    expect(result.executedActionId).toBe('action-1');
  });

  it('prevents re-execution via idempotency check on executedActionIds', async () => {
    const pendingAction: PendingAction = {
      type: 'send_announcement',
      params: { text: 'Дублированное объявление', mention_students: false },
      summary: 'Annonce deja executee',
      id: 'action-already-done',
    };

    const context = makeContext({
      messages: [{ role: 'user', content: 'Оки' }],
      pendingAction,
      executedActionIds: new Set(['action-already-done']),
    });

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('execute_pending', {}))
      .mockResolvedValueOnce(makeTextResponse('Action deja executee.'));

    await runTsaragAgent(context);

    // sendAnnouncement should NOT have been called (idempotency)
    expect(context.discordActions.sendAnnouncement).not.toHaveBeenCalled();
  });

  it('returns turnMessages containing tool conversation messages', async () => {
    vi.mocked(getStudentsBySession).mockResolvedValue([MOCK_STUDENT]);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('list_students', {}))
      .mockResolvedValueOnce(makeTextResponse('Студентов: 1'));

    const result = await runTsaragAgent(makeContext());

    // turnMessages should contain: assistant (tool_use), user (tool_result), assistant (final text)
    expect(result.turnMessages).toBeDefined();
    expect(result.turnMessages.length).toBeGreaterThanOrEqual(2);
    // Last message should be the final assistant response
    const lastMsg = result.turnMessages[result.turnMessages.length - 1];
    expect(lastMsg!.role).toBe('assistant');
  });

  it('handles tool execution error gracefully and returns response', async () => {
    vi.mocked(getStudentsBySession).mockRejectedValueOnce(new Error('DB connection timeout'));

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('list_students', {}))
      .mockResolvedValueOnce(makeTextResponse('Произошла ошибка при получении данных.'));

    const result = await runTsaragAgent(makeContext());

    // Agent should continue after tool error and return final text
    expect(result.text).toBeDefined();
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('respects maximum iteration limit of 8', async () => {
    // Always return tool_use — never end_turn
    mockCreate.mockResolvedValue(makeToolUseResponse('list_students', {}));
    vi.mocked(getStudentsBySession).mockResolvedValue([]);

    const result = await runTsaragAgent(makeContext());

    // Should have stopped at maxIterations (8)
    expect(mockCreate).toHaveBeenCalledTimes(8);
    // Should still return a result (not crash)
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
  });

  it('passes conversation history to Claude API', async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse('Понял!'));

    const history: TsaragAgentContext['messages'] = [
      { role: 'user', content: 'Первый вопрос' },
      { role: 'assistant', content: 'Первый ответ' },
      { role: 'user', content: 'Второй вопрос' },
    ];

    await runTsaragAgent(makeContext({ messages: history }));

    const callArgs = mockCreate.mock.calls[0]![0] as { messages: unknown[] };
    expect(callArgs.messages).toHaveLength(3);
  });

  it('routes search_course_content tool to searchFormationKnowledge', async () => {
    vi.mocked(searchFormationKnowledge).mockResolvedValue([]);

    mockCreate
      .mockResolvedValueOnce(makeToolUseResponse('search_course_content', { query: 'что такое агент' }))
      .mockResolvedValueOnce(makeTextResponse('По запросу ничего не найдено.'));

    await runTsaragAgent(makeContext({
      messages: [{ role: 'user', content: 'Что такое агент по программе?' }],
    }));

    expect(searchFormationKnowledge).toHaveBeenCalled();
  });
});
