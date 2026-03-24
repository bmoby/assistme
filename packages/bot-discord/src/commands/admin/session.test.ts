import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleSession } from './session.js';
import {
  createSession,
  updateSession,
  buildSessionForumContent,
  buildSessionAnnouncement,
} from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import { createSession as createSessionFixture } from '../../__mocks__/fixtures/domain/index.js';
import { ChannelType } from 'discord.js';

// ============================================
// Typed mocks
// ============================================

const mockedCreateSession = createSession as MockedFunction<typeof createSession>;
const mockedUpdateSession = updateSession as MockedFunction<typeof updateSession>;
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

describe('handleSession', () => {
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
      .withStringOption('название', 'Test Session')
      .withIntegerOption('модуль', 1)
      .build();

    await handleSession(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it('creates session in DB and replies with success (no forum channel found)', async () => {
    const sessionFixture = createSessionFixture({ session_number: 3, title: 'Intro to AI', module: 1 });
    mockedCreateSession.mockResolvedValue(sessionFixture);
    mockedUpdateSession.mockResolvedValue(sessionFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 3)
      .withStringOption('название', 'Intro to AI')
      .withIntegerOption('модуль', 1)
      .build();

    await handleSession(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockedCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ session_number: 3, title: 'Intro to AI', module: 1, status: 'published' })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Intro to AI')
    );
  });

  it('creates forum thread when forum channel is found', async () => {
    const sessionFixture = createSessionFixture({ session_number: 4, title: 'Session 4', module: 2 });
    mockedCreateSession.mockResolvedValue(sessionFixture);
    mockedUpdateSession.mockResolvedValue(sessionFixture);

    const mockThread = { id: 'thread-1' };
    const mockForumChannel = {
      name: 'сессии',
      type: ChannelType.GuildForum,
      availableTags: [{ id: 'tag-1', name: 'Модуль 2' }],
      threads: {
        create: vi.fn().mockResolvedValue(mockThread),
      },
    };

    const guild = {
      id: 'guild-1',
      channels: {
        cache: {
          find: vi.fn((pred: (ch: typeof mockForumChannel) => boolean) =>
            pred(mockForumChannel) ? mockForumChannel : undefined
          ),
        },
      },
      roles: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
        },
      },
      members: { fetch: vi.fn() },
    };

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withGuild(guild)
      .withIntegerOption('номер', 4)
      .withStringOption('название', 'Session 4')
      .withIntegerOption('модуль', 2)
      .build();

    await handleSession(interaction);

    expect(mockForumChannel.threads.create).toHaveBeenCalled();
    expect(mockedUpdateSession).toHaveBeenCalledWith(
      sessionFixture.id,
      expect.objectContaining({ discord_thread_id: 'thread-1' })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Session 4')
    );
  });

  it('handles createSession throwing an error', async () => {
    mockedCreateSession.mockRejectedValue(new Error('DB error'));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('номер', 1)
      .withStringOption('название', 'Failing Session')
      .withIntegerOption('модуль', 1)
      .build();

    await handleSession(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка')
    );
  });
});
