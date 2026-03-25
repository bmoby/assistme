/**
 * DM Agent integration test.
 *
 * Tests the DM Agent against a real Supabase instance with a mocked Claude API.
 * This validates the full DB read path (getStudentByDiscordId, getExercisesByStudent,
 * getPublishedSessions) without making real AI API calls.
 *
 * Requirements:
 * - Supabase local must be running: `supabase start`
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY must be set (configured via vitest.config.ts)
 */

import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient, createTestRunId, cleanupTestData } from '../../../../../test/integration-helpers.js';

// ============================================
// Mocks — must be hoisted before any import
// that loads @anthropic-ai/sdk
// ============================================

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

// Mock embeddings — DM agent calls getEmbedding for search_course_content
// which requires a running embedding server; return null for tests.
vi.mock('../../ai/embeddings.js', () => ({
  getEmbedding: vi.fn().mockResolvedValue(null),
}));

// ============================================
// Agent import — after mocks
// ============================================

import { runDmAgent } from './dm-agent.js';
import type { DmAgentContext } from './dm-agent.js';

// ============================================
// Helpers: build mock Claude responses
// ============================================

function makeEndTurnResponse(text: string) {
  return {
    id: 'msg_end_turn',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

function makeToolUseResponse(toolName: string, toolInput: Record<string, unknown>) {
  return {
    id: 'msg_tool_use',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'call_test_1',
        name: toolName,
        input: toolInput,
      },
    ],
    stop_reason: 'tool_use',
    stop_sequence: null,
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 150, output_tokens: 60 },
  };
}

// ============================================
// Test setup
// ============================================

const TEST_RUN_ID = createTestRunId();
const adminDb = createTestClient();
const TEST_DISCORD_ID = `discord-intg-${TEST_RUN_ID}`;

function makeContext(overrides?: Partial<DmAgentContext>): DmAgentContext {
  return {
    discordUserId: TEST_DISCORD_ID,
    messages: [{ role: 'user', content: 'Привет! Какой у меня прогресс?' }],
    pendingAttachments: [],
    ...overrides,
  };
}

beforeAll(async () => {
  // Seed a real student row in the database so the agent can find it
  const { error } = await adminDb.from('students').insert({
    name: `${TEST_RUN_ID}-IntegStudent`,
    discord_id: TEST_DISCORD_ID,
    session: 2,
    status: 'active',
    payment_status: 'paid',
  });
  if (error) {
    throw new Error(`Failed to seed student for integration test: ${error.message}`);
  }
});

afterAll(async () => {
  await cleanupTestData(adminDb, 'students', 'name', TEST_RUN_ID);
});

beforeEach(() => {
  mockCreate.mockReset();
});

// ============================================
// Tests
// ============================================

describe('DM Agent — integration with real Supabase + mocked Claude', () => {
  it('resolves student from real DB and produces a text response (end_turn, no tools)', async () => {
    const EXPECTED_TEXT = 'Привет! Вот твой прогресс по курсу.';
    mockCreate.mockResolvedValueOnce(makeEndTurnResponse(EXPECTED_TEXT));

    const result = await runDmAgent(makeContext());

    // The agent should not throw — DB read path worked end-to-end
    expect(result).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.text).toBe(EXPECTED_TEXT);
    // No tool calls means Claude was only called once
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('handles tool use with real DB data (get_student_progress fetches real exercises + sessions)', async () => {
    const FINAL_TEXT = 'Ты прошёл 0 сессий из 24.';

    // Turn 1: Claude calls get_student_progress (no input required)
    mockCreate.mockResolvedValueOnce(makeToolUseResponse('get_student_progress', {}));
    // Turn 2: Claude produces final text after receiving tool result
    mockCreate.mockResolvedValueOnce(makeEndTurnResponse(FINAL_TEXT));

    const result = await runDmAgent(makeContext());

    // Agent should call Claude twice (tool call + final response)
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.text).toBe(FINAL_TEXT);
  });

  it('handles non-existent student gracefully (returns error message, not a crash)', async () => {
    // No mock needed — the agent returns before calling Claude when student not found
    const NONEXISTENT_DISCORD_ID = `nonexistent-${TEST_RUN_ID}`;

    const result = await runDmAgent(
      makeContext({ discordUserId: NONEXISTENT_DISCORD_ID })
    );

    // Agent should return the "not found" response without calling Claude
    expect(result).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    // Claude should NOT have been called — agent exits early
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
