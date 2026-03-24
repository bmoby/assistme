/**
 * Smoke test to verify the mock infrastructure is importable and functional.
 * This test is part of the unit test suite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MessageBuilder,
  GuildMemberBuilder,
  CommandInteractionBuilder,
  ButtonInteractionBuilder,
  resetSeq,
} from './discord/builders.js';
import { TextChannel, GuildMember } from 'discord.js';
import {
  mockAnthropicCreate,
  mockToolUseSequence,
  getAnthropicMockFactory,
} from './core/anthropic-mock.js';

describe('Discord object builders', () => {
  beforeEach(() => {
    resetSeq();
    mockAnthropicCreate.mockReset();
  });

  it('GuildMemberBuilder produces instanceof GuildMember', () => {
    const member = new GuildMemberBuilder()
      .withId('user-1')
      .withRole({ name: 'student' })
      .build();
    expect(member instanceof GuildMember).toBe(true);
    expect(member.roles.cache.some((r: { name: string }) => r.name === 'student')).toBe(true);
  });

  it('GuildMemberBuilder roles.cache.some() returns false for missing role', () => {
    const member = new GuildMemberBuilder()
      .withId('user-2')
      .withRole({ name: 'mentor' })
      .build();
    expect(member.roles.cache.some((r: { name: string }) => r.name === 'admin')).toBe(false);
  });

  it('MessageBuilder guild text channel is instanceof TextChannel', () => {
    const msg = new MessageBuilder().withContent('hello').inGuild().build();
    expect(msg.channel instanceof TextChannel).toBe(true);
    expect(msg.guild).not.toBeNull();
    expect(msg.content).toBe('hello');
  });

  it('MessageBuilder DM channel is NOT instanceof TextChannel and guild is null', () => {
    const msg = new MessageBuilder().withContent('dm-message').asDM().build();
    expect(msg.channel instanceof TextChannel).toBe(false);
    expect(msg.guild).toBeNull();
  });

  it('CommandInteractionBuilder options.getInteger/getString/getBoolean work', () => {
    const cmd = new CommandInteractionBuilder()
      .withIntegerOption('count', 5)
      .withStringOption('name', 'alice')
      .withBooleanOption('active', true)
      .build();
    expect(cmd.options.getInteger('count')).toBe(5);
    expect(cmd.options.getString('name')).toBe('alice');
    expect(cmd.options.getBoolean('active')).toBe(true);
    expect(cmd.options.getInteger('missing')).toBeNull();
    expect(cmd.options.getString('missing')).toBeNull();
  });

  it('ButtonInteractionBuilder customId, channel.isThread(), client.user.id', () => {
    const btn = new ButtonInteractionBuilder()
      .withCustomId('review_open_abc123')
      .withClientUserId('bot-user-id')
      .build();
    expect(btn.customId).toBe('review_open_abc123');
    expect(btn.client.user?.id).toBe('bot-user-id');
    expect(btn.channel?.isThread()).toBe(false);
  });

  it('resetSeq() resets the ID counter to produce deterministic ids', () => {
    resetSeq();
    const m1 = new MessageBuilder().build();
    resetSeq();
    const m2 = new MessageBuilder().build();
    // Both should get the same first ID
    expect(m1.id).toBe(m2.id);
  });
});

describe('Anthropic mock helpers', () => {
  beforeEach(() => {
    mockAnthropicCreate.mockReset();
  });

  it('getAnthropicMockFactory returns object with default key', () => {
    const factory = getAnthropicMockFactory();
    expect('default' in factory).toBe(true);
  });

  it('getAnthropicMockFactory().default creates Anthropic instance with messages.create', () => {
    const factory = getAnthropicMockFactory();
    const AnthropicConstructor = factory['default'] as () => { messages: { create: unknown } };
    const instance = AnthropicConstructor();
    expect(instance.messages.create).toBe(mockAnthropicCreate);
  });

  it('mockToolUseSequence queues tool_use then end_turn responses', async () => {
    mockToolUseSequence('search_course_content', { query: 'modules' }, 'Here is the content');
    const r1 = await mockAnthropicCreate() as {
      stop_reason: string;
      content: Array<{ type: string; name: string; input: Record<string, unknown> }>;
    };
    const r2 = await mockAnthropicCreate() as {
      stop_reason: string;
      content: Array<{ type: string; text: string }>;
    };

    expect(r1.stop_reason).toBe('tool_use');
    expect(r1.content[0]?.type).toBe('tool_use');
    expect(r1.content[0]?.name).toBe('search_course_content');
    expect(r1.content[0]?.input).toEqual({ query: 'modules' });

    expect(r2.stop_reason).toBe('end_turn');
    expect(r2.content[0]?.type).toBe('text');
    expect(r2.content[0]?.text).toBe('Here is the content');
  });
});
