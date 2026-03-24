/**
 * Shared Anthropic SDK mock helpers for Vitest.
 *
 * Usage in a test file:
 *
 *   import { vi, beforeEach } from 'vitest';
 *   import {
 *     mockAnthropicCreate,
 *     mockToolUseSequence,
 *     getAnthropicMockFactory,
 *   } from '../__mocks__/core/anthropic-mock.js';
 *
 *   vi.mock('@anthropic-ai/sdk', () => getAnthropicMockFactory());
 *
 *   beforeEach(() => { mockAnthropicCreate.mockReset(); });
 */

import { vi } from 'vitest';

// ============================================
// Core mock fn
// ============================================

/**
 * The `messages.create` mock function.
 * Configure it with `mockResolvedValue` / `mockResolvedValueOnce` in your tests.
 * Reset in `beforeEach` with `mockAnthropicCreate.mockReset()`.
 */
export const mockAnthropicCreate = vi.fn();

// ============================================
// Sequence helpers
// ============================================

/**
 * Configure a two-turn tool-use sequence on `mockAnthropicCreate`:
 *   Turn 1 — Claude responds with a tool_use block (stop_reason: 'tool_use')
 *   Turn 2 — Claude responds with a final text message (stop_reason: 'end_turn')
 *
 * @param toolName   The tool name Claude "calls" (e.g. 'get_student_info')
 * @param toolInput  The input object Claude passes to the tool
 * @param finalText  The final assistant text after the tool result is fed back
 */
export function mockToolUseSequence(
  toolName: string,
  toolInput: Record<string, unknown>,
  finalText: string
): void {
  // Turn 1: Claude decides to call a tool
  mockAnthropicCreate.mockResolvedValueOnce({
    id: 'msg_tool_use',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'call_1',
        name: toolName,
        input: toolInput,
      },
    ],
    stop_reason: 'tool_use',
    stop_sequence: null,
    model: 'claude-sonnet-4-5',
    usage: { input_tokens: 100, output_tokens: 50 },
  });

  // Turn 2: Claude produces the final text after receiving the tool result
  mockAnthropicCreate.mockResolvedValueOnce({
    id: 'msg_final',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: finalText,
      },
    ],
    stop_reason: 'end_turn',
    stop_sequence: null,
    model: 'claude-sonnet-4-5',
    usage: { input_tokens: 200, output_tokens: 80 },
  });
}

/**
 * Configure a multi-turn sequence with arbitrary response shapes.
 * Each entry in `responses` is queued via `mockResolvedValueOnce`.
 * Use for complex scenarios that exceed a single tool-use round trip.
 */
export function mockMultiTurnSequence(responses: unknown[]): void {
  for (const response of responses) {
    mockAnthropicCreate.mockResolvedValueOnce(response);
  }
}

// ============================================
// Factory for vi.mock()
// ============================================

/**
 * Returns the factory object to pass to `vi.mock('@anthropic-ai/sdk', ...)`.
 *
 * The `default` key is CRITICAL — dm-agent.ts uses `import Anthropic from '@anthropic-ai/sdk'`
 * (default import). Without `default`, the mock is a no-op and real API calls happen in tests.
 *
 * Usage:
 *   vi.mock('@anthropic-ai/sdk', () => getAnthropicMockFactory());
 */
export function getAnthropicMockFactory(): Record<string, unknown> {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate,
      },
    })),
  };
}
