import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mswServer = setupServer();

export const handlers = {
  anthropicSuccess: (responseText: string) =>
    http.post('https://api.anthropic.com/v1/messages', () =>
      HttpResponse.json({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: responseText }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        model: 'claude-sonnet-4-5',
        usage: { input_tokens: 10, output_tokens: 5 },
      })
    ),

  anthropicToolUse: (toolName: string, toolInput: Record<string, unknown>) =>
    http.post('https://api.anthropic.com/v1/messages', () =>
      HttpResponse.json({
        id: 'msg_tool',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'call_1', name: toolName, input: toolInput }],
        stop_reason: 'tool_use',
        stop_sequence: null,
        model: 'claude-sonnet-4-5',
        usage: { input_tokens: 100, output_tokens: 50 },
      })
    ),

  supabaseSelect: (tableName: string, data: unknown[]) =>
    http.get(`http://127.0.0.1:54321/rest/v1/${tableName}*`, () =>
      HttpResponse.json(data)
    ),
};
