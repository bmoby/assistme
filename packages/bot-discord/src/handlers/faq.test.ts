import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// vi.mock MUST come before imports that use the mocked modules
vi.mock('@assistme/core');

import { setupFaqHandler } from './faq.js';
import {
  getAllFaqEntries,
  answerFaqQuestion,
  incrementFaqUsage,
  createFaqEntry,
  createFormationEvent,
} from '@assistme/core';
import { MessageBuilder, GuildMemberBuilder, resetSeq } from '../__mocks__/discord/builders.js';
import { createFaqEntry as createFaqFixture } from '../__mocks__/fixtures/domain/faq-entry.js';
import type { Client } from 'discord.js';

// ============================================
// Typed mocks
// ============================================

const mockedGetAllFaqEntries = getAllFaqEntries as MockedFunction<typeof getAllFaqEntries>;
const mockedAnswerFaqQuestion = answerFaqQuestion as MockedFunction<typeof answerFaqQuestion>;
const mockedIncrementFaqUsage = incrementFaqUsage as MockedFunction<typeof incrementFaqUsage>;
const mockedCreateFaqEntry = createFaqEntry as MockedFunction<typeof createFaqEntry>;
const mockedCreateFormationEvent = createFormationEvent as MockedFunction<typeof createFormationEvent>;

// ============================================
// Mock Client factory
// ============================================

function makeClient() {
  const handlers = new Map<string, ((...args: unknown[]) => unknown)>();
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(event, handler);
    }),
    __emit: async (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) await handler(...args);
    },
  };
}

// ============================================
// Tests
// ============================================

describe('setupFaqHandler', () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
    client = makeClient();
    setupFaqHandler(client as unknown as Client);
  });

  it('ignores bot messages', async () => {
    const message = new MessageBuilder()
      .withContent('Is this a bot question?')
      .asBot()
      .inChannel('faq')
      .build();

    await client.__emit('messageCreate', message);

    expect(mockedGetAllFaqEntries).not.toHaveBeenCalled();
    expect(mockedAnswerFaqQuestion).not.toHaveBeenCalled();
  });

  it('ignores messages in DM (non-TextChannel channel)', async () => {
    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('What is an AI agent?')
      .asDM()
      .withMember(member)
      .build();

    await client.__emit('messageCreate', message);

    expect(mockedGetAllFaqEntries).not.toHaveBeenCalled();
    expect(mockedAnswerFaqQuestion).not.toHaveBeenCalled();
  });

  it('ignores messages outside the FAQ channel', async () => {
    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('What is an AI agent?')
      .withMember(member)
      .inChannel('general')
      .build();

    await client.__emit('messageCreate', message);

    expect(mockedGetAllFaqEntries).not.toHaveBeenCalled();
    expect(mockedAnswerFaqQuestion).not.toHaveBeenCalled();
  });

  it('ignores messages from users with no matching role', async () => {
    const member = new GuildMemberBuilder().withRole({ name: 'visitor' }).build();
    const message = new MessageBuilder()
      .withContent('What is an AI agent?')
      .withMember(member)
      .inChannel('faq')
      .build();

    await client.__emit('messageCreate', message);

    expect(mockedAnswerFaqQuestion).not.toHaveBeenCalled();
    expect(mockedGetAllFaqEntries).not.toHaveBeenCalled();
  });

  it('ignores student messages shorter than 5 characters', async () => {
    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('Hi')
      .withMember(member)
      .inChannel('faq')
      .build();

    await client.__emit('messageCreate', message);

    expect(mockedAnswerFaqQuestion).not.toHaveBeenCalled();
  });

  it('answers student question with high confidence (>= 70) and tracks usage', async () => {
    const faqFixture = createFaqFixture({ id: 'faq-0' });
    mockedGetAllFaqEntries.mockResolvedValue([faqFixture]);
    mockedAnswerFaqQuestion.mockResolvedValue({
      answer: 'ИИ-агент — это автономная система, которая выполняет задачи.',
      confidence: 85,
      matchedFaqId: 'faq-0',
      suggestAddToFaq: false,
    });
    mockedIncrementFaqUsage.mockResolvedValue(undefined as never);

    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('Что такое ИИ-агент?')
      .withMember(member)
      .inChannel('faq')
      .build();

    await client.__emit('messageCreate', message);

    expect(mockedAnswerFaqQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Что такое ИИ-агент?' })
    );
    expect(message.reply).toHaveBeenCalled();
    expect(mockedIncrementFaqUsage).toHaveBeenCalledWith('faq-0');
  });

  it('adds to FAQ when suggestAddToFaq is true', async () => {
    const faqFixture = createFaqFixture({ id: 'faq-0' });
    mockedGetAllFaqEntries.mockResolvedValue([faqFixture]);
    mockedAnswerFaqQuestion.mockResolvedValue({
      answer: 'Промпт — это инструкция для ИИ-модели.',
      confidence: 80,
      matchedFaqId: null,
      suggestAddToFaq: true,
    });
    mockedCreateFaqEntry.mockResolvedValue(createFaqFixture() as never);
    mockedIncrementFaqUsage.mockResolvedValue(undefined as never);

    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('Что такое промпт?')
      .withMember(member)
      .inChannel('faq')
      .build();

    await client.__emit('messageCreate', message);

    expect(message.reply).toHaveBeenCalled();
    expect(mockedCreateFaqEntry).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'faq-agent' })
    );
    // No matchedFaqId so incrementFaqUsage should NOT be called
    expect(mockedIncrementFaqUsage).not.toHaveBeenCalled();
  });

  it('creates formation event when confidence is low (< 70)', async () => {
    const faqFixture = createFaqFixture({ id: 'faq-0' });
    mockedGetAllFaqEntries.mockResolvedValue([faqFixture]);
    mockedAnswerFaqQuestion.mockResolvedValue({
      answer: 'Не уверен.',
      confidence: 40,
      matchedFaqId: null,
      suggestAddToFaq: false,
    });
    mockedCreateFormationEvent.mockResolvedValue(undefined as never);

    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('Что значит функция высшего порядка?')
      .withMember(member)
      .inChannel('faq')
      .build();

    await client.__emit('messageCreate', message);

    expect(message.reply).toHaveBeenCalled();
    expect(mockedCreateFormationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'student_alert' })
    );
    expect(mockedIncrementFaqUsage).not.toHaveBeenCalled();
  });

  it('admin reply to student message adds to FAQ (no duplicate)', async () => {
    mockedGetAllFaqEntries.mockResolvedValue([]);
    mockedCreateFaqEntry.mockResolvedValue(createFaqFixture() as never);

    const studentMessage = new MessageBuilder()
      .withContent('Что такое ИИ-агент?')
      .withAuthorId('student-1')
      .inChannel('faq')
      .build();

    const adminMember = new GuildMemberBuilder().withRole({ name: 'tsarag' }).build();
    const adminMessage = new MessageBuilder()
      .withContent('ИИ-агент — это автономная программа.')
      .withMember(adminMember)
      .inChannel('faq')
      .withReference('ref-msg-id')
      .build();

    // Mock channel.messages.fetch to return the student message directly (fetch by ID returns Message)
    (adminMessage.channel as unknown as { messages: { fetch: ReturnType<typeof vi.fn> } })
      .messages.fetch = vi.fn().mockResolvedValue(studentMessage);

    await client.__emit('messageCreate', adminMessage);

    expect(mockedCreateFaqEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Что такое ИИ-агент?',
        answer: 'ИИ-агент — это автономная программа.',
        created_by: 'formateur',
      })
    );
  });

  it('admin reply skips FAQ creation when duplicate exists', async () => {
    const existingFaq = createFaqFixture({ question: 'Что такое ИИ-агент?' });
    mockedGetAllFaqEntries.mockResolvedValue([existingFaq]);

    const studentMessage = new MessageBuilder()
      .withContent('Что такое ИИ-агент?')
      .withAuthorId('student-2')
      .inChannel('faq')
      .build();

    const adminMember = new GuildMemberBuilder().withRole({ name: 'tsarag' }).build();
    const adminMessage = new MessageBuilder()
      .withContent('Это автономная программа.')
      .withMember(adminMember)
      .inChannel('faq')
      .withReference('ref-msg-id-2')
      .build();

    // Mock channel.messages.fetch to return the student message directly (fetch by ID returns Message)
    (adminMessage.channel as unknown as { messages: { fetch: ReturnType<typeof vi.fn> } })
      .messages.fetch = vi.fn().mockResolvedValue(studentMessage);

    await client.__emit('messageCreate', adminMessage);

    // Duplicate detected — createFaqEntry should NOT be called
    expect(mockedCreateFaqEntry).not.toHaveBeenCalled();
    // Should react with checkmark instead
    expect(adminMessage.react).toHaveBeenCalled();
  });

  it('handles answerFaqQuestion throwing an error gracefully', async () => {
    mockedGetAllFaqEntries.mockResolvedValue([createFaqFixture()]);
    mockedAnswerFaqQuestion.mockRejectedValue(new Error('API error'));

    const member = new GuildMemberBuilder().withRole({ name: 'student' }).build();
    const message = new MessageBuilder()
      .withContent('Что такое ИИ-агент?')
      .withMember(member)
      .inChannel('faq')
      .build();

    // Should not throw
    await expect(client.__emit('messageCreate', message)).resolves.not.toThrow();

    // Handler should catch and reply with error message
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('Техническая ошибка')
    );
  });
});
