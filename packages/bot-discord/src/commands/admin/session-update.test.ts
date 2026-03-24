import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleSessionUpdate } from './session-update.js';
import {
  getSessionByNumber,
  updateSession,
  createMeetEvent,
  buildSessionForumContent,
  buildSessionAnnouncement,
} from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import { createSession as createSessionFixture } from '../../__mocks__/fixtures/domain/index.js';

// ============================================
// Typed mocks
// ============================================

const mockedGetSessionByNumber = getSessionByNumber as MockedFunction<typeof getSessionByNumber>;
const mockedUpdateSession = updateSession as MockedFunction<typeof updateSession>;
const mockedCreateMeetEvent = createMeetEvent as MockedFunction<typeof createMeetEvent>;
const mockedBuildSessionForumContent = buildSessionForumContent as MockedFunction<typeof buildSessionForumContent>;
const mockedBuildSessionAnnouncement = buildSessionAnnouncement as MockedFunction<typeof buildSessionAnnouncement>;

// ============================================
// Helpers
// ============================================

function makeAdminMember() {
  return new GuildMemberBuilder().withRole({ name: 'tsarag' }).build();
}

function makeNonAdminMember() {
  return new GuildMemberBuilder().withRole({ name: 'student' }).build();
}

// ============================================
// Tests
// ============================================

describe('handleSessionUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
    mockedBuildSessionForumContent.mockReturnValue('Forum content');
    mockedBuildSessionAnnouncement.mockReturnValue('Announcement content');
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .withIntegerOption('номер', 1)
      .withStringOption('задание', 'Build an AI agent')
      .build();

    await handleSessionUpdate(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
    expect(mockedGetSessionByNumber).not.toHaveBeenCalled();
  });

  it('rejects when no fields provided', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 1)
      // No optional fields provided
      .build();

    await handleSessionUpdate(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('хотя бы одно поле'),
        ephemeral: true,
      })
    );
    expect(mockedGetSessionByNumber).not.toHaveBeenCalled();
  });

  it('replies with error when session not found', async () => {
    mockedGetSessionByNumber.mockResolvedValue(null);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 99)
      .withStringOption('задание', 'New task description')
      .build();

    await handleSessionUpdate(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('не найдена') })
    );
    expect(mockedUpdateSession).not.toHaveBeenCalled();
  });

  it('happy path: updates exercise description and replies with confirmation', async () => {
    const sessionFixture = createSessionFixture({ session_number: 1 });
    mockedGetSessionByNumber.mockResolvedValue(sessionFixture);
    mockedUpdateSession.mockResolvedValue(sessionFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 1)
      .withStringOption('задание', 'Build an AI agent with tool use')
      .build();

    await handleSessionUpdate(interaction);

    expect(mockedUpdateSession).toHaveBeenCalledWith(
      sessionFixture.id,
      expect.objectContaining({ exercise_description: 'Build an AI agent with tool use' })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('обновлена') })
    );
  });

  it('updates status and replies with confirmation', async () => {
    const sessionFixture = createSessionFixture({ session_number: 2, status: 'draft' });
    mockedGetSessionByNumber.mockResolvedValue(sessionFixture);
    mockedUpdateSession.mockResolvedValue(sessionFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 2)
      .withStringOption('статус', 'completed')
      .build();

    await handleSessionUpdate(interaction);

    expect(mockedUpdateSession).toHaveBeenCalledWith(
      sessionFixture.id,
      expect.objectContaining({ status: 'completed' })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('статус') })
    );
  });

  it('updates title and description fields', async () => {
    const sessionFixture = createSessionFixture({ session_number: 3 });
    mockedGetSessionByNumber.mockResolvedValue(sessionFixture);
    mockedUpdateSession.mockResolvedValue(sessionFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 3)
      .withStringOption('название', 'New Title')
      .withStringOption('тема', 'New topic description')
      .build();

    await handleSessionUpdate(interaction);

    expect(mockedUpdateSession).toHaveBeenCalledWith(
      sessionFixture.id,
      expect.objectContaining({ title: 'New Title', description: 'New topic description' })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('обновлена') })
    );
  });

  it('handles DB error gracefully', async () => {
    const sessionFixture = createSessionFixture({ session_number: 5 });
    mockedGetSessionByNumber.mockResolvedValue(sessionFixture);
    mockedUpdateSession.mockRejectedValue(new Error('DB error'));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 5)
      .withStringOption('задание', 'Some task')
      .build();

    await handleSessionUpdate(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Ошибка') })
    );
  });
});
