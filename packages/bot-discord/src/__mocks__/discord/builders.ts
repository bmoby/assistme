/**
 * Discord.js object builders for testing.
 *
 * discord.js v14 uses private constructors — direct instantiation is impossible
 * in TypeScript strict mode. These builders create plain objects with `as unknown as
 * DiscordType` casts and `vi.fn()` stubs for all methods handlers actually use.
 *
 * Usage:
 *   const msg = new MessageBuilder().withContent('hello').withAuthorId('user-1').build();
 *   const member = new GuildMemberBuilder().withId('user-1').withRole({ name: 'student' }).build();
 *   const cmd = new CommandInteractionBuilder().withMember(member).build();
 */

import { vi } from 'vitest';
import { TextChannel, GuildMember, Message, ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';

// ============================================
// ID generator
// ============================================

let seq = 0;
function nextId(): string {
  return 'id-' + String(++seq);
}

/** Reset the ID counter — call in beforeEach to keep IDs deterministic. */
export function resetSeq(): void {
  seq = 0;
}

// ============================================
// GuildMemberBuilder
// ============================================

export interface MockRole {
  id?: string;
  name: string;
}

/**
 * Builds a GuildMember-shaped object.
 *
 * `roles.cache.some()` works correctly so `isAdmin()` / `isStudent()` / `isMentor()`
 * from `utils/auth.ts` return correct values.
 *
 * `interaction.member instanceof GuildMember` check in auth.ts line 8 is satisfied by
 * using `Object.create(GuildMember.prototype)` as the base object.
 */
export class GuildMemberBuilder {
  private id: string = nextId();
  private roles: MockRole[] = [];

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withRole(role: MockRole): this {
    this.roles.push({
      id: role.id ?? nextId(),
      name: role.name,
    });
    return this;
  }

  build(): GuildMember {
    const storedRoles = [...this.roles];

    // Build a Collection-like roles.cache with .some() / .find() / .has()
    const rolesCache = {
      some: (pred: (role: MockRole) => boolean): boolean => storedRoles.some(pred),
      find: (pred: (role: MockRole) => boolean): MockRole | undefined => storedRoles.find(pred),
      has: (id: string): boolean => storedRoles.some((r) => r.id === id),
      [Symbol.iterator]: function* () {
        yield* storedRoles;
      },
    };

    // Use GuildMember.prototype as base so instanceof checks pass.
    // GuildMember.prototype defines some properties as getters, so we must
    // use Object.defineProperty for all properties to avoid "read-only setter" errors.
    const memberId = this.id;
    const base = Object.create(GuildMember.prototype) as Record<string, unknown>;
    const props: Record<string, PropertyDescriptor> = {
      id: { value: memberId, writable: true, configurable: true, enumerable: true },
      user: {
        value: { id: memberId, bot: false, displayName: 'Test User' },
        writable: true, configurable: true, enumerable: true,
      },
      roles: {
        value: { cache: rolesCache },
        writable: true, configurable: true, enumerable: true,
      },
      createDM: {
        value: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue(undefined) }),
        writable: true, configurable: true, enumerable: true,
      },
      displayName: {
        value: 'Test User',
        writable: true, configurable: true, enumerable: true,
      },
    };
    Object.defineProperties(base, props);

    return base as unknown as GuildMember;
  }
}

// ============================================
// MessageBuilder
// ============================================

/**
 * Builds a Message-shaped object.
 *
 * - Guild text channel: `Object.create(TextChannel.prototype)` base so
 *   `message.channel instanceof TextChannel` returns true (required by faq.ts line 14).
 * - DM: `guild: null`, plain channel object (no TextChannel prototype).
 * - `reply` and `react` are `vi.fn().mockResolvedValue(undefined)`.
 * - `channel.sendTyping`, `channel.send`, `channel.messages.fetch` are `vi.fn()`.
 */
export class MessageBuilder {
  private content: string = '';
  private authorId: string = nextId();
  private isBot: boolean = false;
  private isDM: boolean = false;
  private channelName: string = 'general';
  private channelId: string = nextId();
  private guildObj: object | null = null;
  private member: GuildMember | null = null;
  private attachments: Map<string, object> = new Map();
  private reference: { messageId: string } | null = null;

  withContent(text: string): this {
    this.content = text;
    return this;
  }

  withAuthorId(id: string): this {
    this.authorId = id;
    return this;
  }

  asBot(): this {
    this.isBot = true;
    return this;
  }

  asDM(): this {
    this.isDM = true;
    this.guildObj = null;
    return this;
  }

  inGuild(guildObj?: object): this {
    this.isDM = false;
    this.guildObj = guildObj ?? this.buildDefaultGuild();
    return this;
  }

  inChannel(name: string): this {
    this.channelName = name;
    return this;
  }

  withMember(member: GuildMember): this {
    this.member = member;
    this.isDM = false;
    if (!this.guildObj) {
      this.guildObj = this.buildDefaultGuild();
    }
    return this;
  }

  withAttachment(id: string, att: object): this {
    this.attachments.set(id, att);
    return this;
  }

  withReference(messageId: string): this {
    this.reference = { messageId };
    return this;
  }

  private buildDefaultGuild(): object {
    return {
      id: nextId(),
      name: 'Test Guild',
      channels: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
      roles: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
        },
      },
      members: {
        fetch: vi.fn().mockResolvedValue(null),
      },
    };
  }

  build(): Message {
    const channelName = this.channelName;

    // For guild text channel: TextChannel.prototype base so instanceof checks pass
    // For DM: plain object
    let channel: object;
    if (this.isDM) {
      channel = {
        id: this.channelId,
        name: channelName,
        isDMBased: () => true,
        sendTyping: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue({ id: nextId() }),
        messages: {
          fetch: vi.fn().mockResolvedValue(new Map()),
        },
      };
    } else {
      channel = Object.assign(Object.create(TextChannel.prototype) as object, {
        id: this.channelId,
        name: channelName,
        isDMBased: () => false,
        sendTyping: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue({ id: nextId() }),
        messages: {
          fetch: vi.fn().mockResolvedValue(new Map()),
        },
      });
    }

    const guildValue = this.isDM ? null : (this.guildObj ?? this.buildDefaultGuild());

    const message = {
      id: nextId(),
      content: this.content,
      author: {
        id: this.authorId,
        bot: this.isBot,
        displayName: 'Test User',
      },
      guild: guildValue,
      channel,
      member: this.member ?? null,
      attachments: this.attachments,
      reference: this.reference,
      reply: vi.fn().mockResolvedValue(undefined),
      react: vi.fn().mockResolvedValue(undefined),
      createdTimestamp: Date.now(),
    };

    return message as unknown as Message;
  }
}

// ============================================
// CommandInteractionBuilder
// ============================================

/**
 * Builds a ChatInputCommandInteraction-shaped object.
 *
 * - `options.getInteger(name)`, `options.getString(name)`, `options.getBoolean(name)` return
 *   stored values or null.
 * - `deferReply`, `editReply`, `reply` are `vi.fn()`.
 * - `guild.channels.cache` and `guild.roles.cache` have `.find(pred)` as `vi.fn()`.
 * - `guild.members.fetch` is `vi.fn()`.
 */
export class CommandInteractionBuilder {
  private memberObj: GuildMember | null = null;
  private guildObj: object | null = null;
  private integerOptions: Map<string, number> = new Map();
  private stringOptions: Map<string, string> = new Map();
  private booleanOptions: Map<string, boolean> = new Map();

  withMember(member: GuildMember): this {
    this.memberObj = member;
    return this;
  }

  withIntegerOption(name: string, value: number): this {
    this.integerOptions.set(name, value);
    return this;
  }

  withStringOption(name: string, value: string): this {
    this.stringOptions.set(name, value);
    return this;
  }

  withBooleanOption(name: string, value: boolean): this {
    this.booleanOptions.set(name, value);
    return this;
  }

  withGuild(guild: object): this {
    this.guildObj = guild;
    return this;
  }

  build(): ChatInputCommandInteraction {
    const storedInts = new Map(this.integerOptions);
    const storedStrings = new Map(this.stringOptions);
    const storedBools = new Map(this.booleanOptions);

    const guild = this.guildObj ?? {
      id: nextId(),
      name: 'Test Guild',
      channels: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
          get: vi.fn().mockReturnValue(undefined),
        },
      },
      roles: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
          get: vi.fn().mockReturnValue(undefined),
        },
      },
      members: {
        fetch: vi.fn().mockResolvedValue(null),
      },
    };

    const interaction = {
      id: nextId(),
      guild,
      member: this.memberObj,
      user: {
        id: this.memberObj ? (this.memberObj as unknown as { id: string }).id : nextId(),
        bot: false,
      },
      options: {
        getInteger: (name: string): number | null => storedInts.get(name) ?? null,
        getString: (name: string): string | null => storedStrings.get(name) ?? null,
        getBoolean: (name: string): boolean | null => storedBools.get(name) ?? null,
        getUser: vi.fn().mockReturnValue(null),
        getMember: vi.fn().mockReturnValue(null),
        getRole: vi.fn().mockReturnValue(null),
        getChannel: vi.fn().mockReturnValue(null),
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
      followUp: vi.fn().mockResolvedValue(undefined),
    };

    return interaction as unknown as ChatInputCommandInteraction;
  }
}

// ============================================
// ButtonInteractionBuilder
// ============================================

/**
 * Builds a ButtonInteraction-shaped object.
 *
 * - `deferReply`, `editReply`, `reply` are `vi.fn()`.
 * - `client.user.id` is configurable.
 * - `channel.isThread()` is `vi.fn()` (returns false by default).
 * - `guild.members.fetch` is `vi.fn()`.
 */
export class ButtonInteractionBuilder {
  private customId: string = 'button-' + nextId();
  private guildObj: object | null = null;
  private channelObj: object | null = null;
  private clientUserId: string = nextId();

  withCustomId(id: string): this {
    this.customId = id;
    return this;
  }

  withGuild(guild: object): this {
    this.guildObj = guild;
    return this;
  }

  withChannel(ch: object): this {
    this.channelObj = ch;
    return this;
  }

  withClientUserId(id: string): this {
    this.clientUserId = id;
    return this;
  }

  build(): ButtonInteraction {
    const guild = this.guildObj ?? {
      id: nextId(),
      name: 'Test Guild',
      channels: {
        cache: {
          find: vi.fn().mockReturnValue(undefined),
          get: vi.fn().mockReturnValue(undefined),
        },
      },
      members: {
        fetch: vi.fn().mockResolvedValue(null),
      },
    };

    const channel = this.channelObj ?? {
      id: nextId(),
      name: 'general',
      isThread: vi.fn().mockReturnValue(false),
      messages: {
        fetch: vi.fn().mockResolvedValue(new Map()),
      },
      send: vi.fn().mockResolvedValue({ id: nextId() }),
    };

    const interaction = {
      id: nextId(),
      customId: this.customId,
      guild,
      channel,
      client: {
        user: {
          id: this.clientUserId,
        },
      },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
      followUp: vi.fn().mockResolvedValue(undefined),
    };

    return interaction as unknown as ButtonInteraction;
  }
}
