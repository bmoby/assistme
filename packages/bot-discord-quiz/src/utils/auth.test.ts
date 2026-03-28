import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuildMember } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';

// ============================================
// Mocks (hoisted before imports)
// ============================================

vi.mock('@assistme/core', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { isAdmin } from './auth.js';

// ============================================
// Helpers: Build mock Discord members / interactions
// ============================================

function buildMemberWithRole(roleName: string, userId: string = 'user-1'): GuildMember {
  const base = Object.create(GuildMember.prototype) as Record<string, unknown>;
  Object.defineProperties(base, {
    id: { value: userId, writable: true, configurable: true, enumerable: true },
    user: { value: { id: userId, bot: false }, writable: true, configurable: true, enumerable: true },
    roles: {
      value: { cache: { some: (pred: (r: { name: string }) => boolean) => pred({ name: roleName }) } },
      writable: true, configurable: true, enumerable: true,
    },
  });
  return base as unknown as GuildMember;
}

function buildMemberWithNoMatchingRole(userId: string = 'user-1'): GuildMember {
  const base = Object.create(GuildMember.prototype) as Record<string, unknown>;
  Object.defineProperties(base, {
    id: { value: userId, writable: true, configurable: true, enumerable: true },
    user: { value: { id: userId, bot: false }, writable: true, configurable: true, enumerable: true },
    roles: {
      value: { cache: { some: () => false } },
      writable: true, configurable: true, enumerable: true,
    },
  });
  return base as unknown as GuildMember;
}

function buildInteraction(member: unknown) {
  return {
    user: { id: 'user-1' },
    member,
    guild: { id: 'guild-1' },
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    replied: false,
    deferred: false,
  } as unknown as ChatInputCommandInteraction;
}

// ============================================
// Tests
// ============================================

describe('isAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when member has role matching ROLES.admin (tsarag)', () => {
    const member = buildMemberWithRole('tsarag');
    const interaction = buildInteraction(member);

    expect(isAdmin(interaction)).toBe(true);
  });

  it('returns false when member has no matching role', () => {
    const member = buildMemberWithNoMatchingRole();
    const interaction = buildInteraction(member);

    expect(isAdmin(interaction)).toBe(false);
  });

  it('returns false when interaction.member is not a GuildMember instance', () => {
    // Plain object that is NOT an instanceof GuildMember
    const plainMember = {
      id: 'user-1',
      user: { id: 'user-1', bot: false },
      roles: { cache: { some: () => true } },
    };
    const interaction = buildInteraction(plainMember);

    expect(isAdmin(interaction)).toBe(false);
  });

  it('returns false when interaction.member is null (DM context)', () => {
    const interaction = buildInteraction(null);

    expect(isAdmin(interaction)).toBe(false);
  });
});
