import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ButtonInteraction } from 'discord.js';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted ensures these are available when factories run)
// ---------------------------------------------------------------------------

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@assistme/core', () => ({
  logger: mockLogger,
}));

vi.mock('./quiz-start.js', () => ({
  handleQuizStart: vi.fn(),
}));

vi.mock('./quiz-answer.js', () => ({
  handleQuizAnswer: vi.fn(),
}));

vi.mock('./quiz-dm.js', () => ({
  handleQuizDm: vi.fn(),
}));

import { registerButton, handleButtonInteraction } from './index.js';

// ---------------------------------------------------------------------------
// Helpers: Build mock ButtonInteraction
// ---------------------------------------------------------------------------

function makeButtonInteraction(customId: string, overrides?: {
  replied?: boolean;
  deferred?: boolean;
}) {
  return {
    customId,
    user: { id: 'user-1' },
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    replied: overrides?.replied ?? false,
    deferred: overrides?.deferred ?? false,
  } as unknown as ButtonInteraction;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleButtonInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the handler when registered prefix matches customId', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    registerButton('test_prefix_', handler);

    const interaction = makeButtonInteraction('test_prefix_some-data');
    await handleButtonInteraction(interaction);

    expect(handler).toHaveBeenCalledWith(interaction);
  });

  it('logs warning when customId matches no registered prefix', async () => {
    const interaction = makeButtonInteraction('unknown_prefix_xyz');
    await handleButtonInteraction(interaction);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ customId: 'unknown_prefix_xyz' }),
      'Unknown quiz button interaction',
    );
  });

  it('logs error and sends ephemeral reply when handler throws', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler boom'));
    registerButton('fail_prefix_', failingHandler);

    const interaction = makeButtonInteraction('fail_prefix_123');
    await handleButtonInteraction(interaction);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error), customId: 'fail_prefix_123' }),
      'Quiz button handler error',
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Произошла ошибка. Попробуйте позже.', ephemeral: true }),
    );
  });

  it('uses followUp instead of reply when interaction is already deferred', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler boom'));
    registerButton('deferred_prefix_', failingHandler);

    const interaction = makeButtonInteraction('deferred_prefix_456', { deferred: true });
    await handleButtonInteraction(interaction);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error), customId: 'deferred_prefix_456' }),
      'Quiz button handler error',
    );
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Произошла ошибка. Попробуйте позже.', ephemeral: true }),
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('uses followUp instead of reply when interaction is already replied', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler boom'));
    registerButton('replied_prefix_', failingHandler);

    const interaction = makeButtonInteraction('replied_prefix_789', { replied: true });
    await handleButtonInteraction(interaction);

    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Произошла ошибка. Попробуйте позже.', ephemeral: true }),
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
