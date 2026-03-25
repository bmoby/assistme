import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleAnnounce } from './announce.js';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import { TextChannel } from 'discord.js';

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

describe('handleAnnounce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .withStringOption('текст', 'Hello everyone!')
      .build();

    await handleAnnounce(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
  });

  it('replies with error when announcement channel not found', async () => {
    const guild = {
      id: 'guild-1',
      channels: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
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
      .withStringOption('текст', 'Important announcement')
      .build();

    await handleAnnounce(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('не найден'), ephemeral: true })
    );
  });

  it('happy path: sends announcement to the channel', async () => {
    const mockChannel = Object.assign(Object.create(TextChannel.prototype) as object, {
      name: 'объявления',
      send: vi.fn().mockResolvedValue(undefined),
    });

    const guild = {
      id: 'guild-1',
      channels: {
        cache: {
          find: vi.fn((pred: (ch: typeof mockChannel) => boolean) =>
            pred(mockChannel) ? mockChannel : undefined
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
      .withStringOption('текст', 'Session 3 starts tomorrow!')
      .build();

    await handleAnnounce(interaction);

    expect((mockChannel as { send: ReturnType<typeof vi.fn> }).send).toHaveBeenCalledWith(
      expect.stringContaining('Session 3 starts tomorrow!')
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('объявления'), ephemeral: true })
    );
  });

  it('includes student role mention when role found', async () => {
    const mockChannel = Object.assign(Object.create(TextChannel.prototype) as object, {
      name: 'объявления',
      send: vi.fn().mockResolvedValue(undefined),
    });

    const mockRole = { id: 'role-student', name: 'student' };

    const guild = {
      id: 'guild-1',
      channels: {
        cache: {
          find: vi.fn((pred: (ch: typeof mockChannel) => boolean) =>
            pred(mockChannel) ? mockChannel : undefined
          ),
        },
      },
      roles: {
        cache: {
          find: vi.fn((pred: (r: typeof mockRole) => boolean) =>
            pred(mockRole) ? mockRole : undefined
          ),
        },
      },
      members: { fetch: vi.fn() },
    };

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withGuild(guild)
      .withStringOption('текст', 'New assignment posted!')
      .build();

    await handleAnnounce(interaction);

    expect((mockChannel as { send: ReturnType<typeof vi.fn> }).send).toHaveBeenCalledWith(
      expect.stringContaining('<@&role-student>')
    );
  });
});
