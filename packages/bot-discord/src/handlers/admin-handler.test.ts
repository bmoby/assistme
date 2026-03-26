/**
 * Unit tests for admin-handler.ts
 *
 * Strategy:
 * - Mock @assistme/core to prevent real DB/AI calls
 * - Mock ../utils/auth.js to control isAdmin() return value
 * - Mock config.js with test channel/role names
 * - Use _clearStateForTesting() in beforeEach to prevent state leaks
 *
 * Key implementation details from admin-handler.ts:
 * - Conversations are keyed by channel.id (not user id)
 * - Channel check: channel.name === CHANNELS.admin ('админ')
 * - Guild check: message.guild must be truthy
 * - Response sent via channel.send() (not message.reply())
 * - Same processingLocks pattern as dm-handler: event handler does NOT await currentLock
 *   so we must drainProcessing() after __emit to wait for async work
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mocks declared before imports (hoisted by Vitest)
vi.mock('@assistme/core');
vi.mock('../utils/auth.js');
vi.mock('../config.js', () => ({
  CHANNELS: {
    annonces: 'объявления',
    sessions: 'сессии',
    chat: 'чат',
    faq: 'faq',
    wins: 'победы',
    admin: 'админ',
  },
  ROLES: { admin: 'tsarag', student: 'student', mentor: 'mentor' },
}));

import { setupAdminHandler, _clearStateForTesting } from './admin-handler.js';
import { runTsaragAgent } from '@assistme/core';
import { isAdmin } from '../utils/auth.js';
import { MessageBuilder, GuildMemberBuilder, resetSeq } from '../__mocks__/discord/builders.js';
import type { Client } from 'discord.js';

// ============================================
// Helper: drain the event loop so async lock chains complete
// ============================================

async function drainProcessing(ms = 50): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// ============================================
// Default Tsarag agent response
// ============================================

const defaultTsaragResponse = {
  text: 'Bien recu.',
  actionsPerformed: [],
  proposedAction: null,
  pendingConsumed: false,
  turnMessages: [],
  executedActionId: null,
};

// ============================================
// Mock client factory
// ============================================

function makeClient() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(event, handler);
    }),
    // NOTE: does NOT await the processing lock — same as dm-handler pattern
    __emit: async (event: string, ...args: unknown[]): Promise<void> => {
      const handler = handlers.get(event);
      if (handler) await handler(...args);
    },
  };
}

// ============================================
// Guild factory for admin channel messages
// ============================================

function makeAdminGuild(channelSend?: ReturnType<typeof vi.fn>) {
  const send = channelSend ?? vi.fn().mockResolvedValue({ id: 'msg-1' });
  return {
    id: 'guild-1',
    name: 'Test Guild',
    channels: {
      cache: {
        find: vi.fn().mockImplementation((pred: (ch: unknown) => boolean) => {
          const ch = { name: 'объявления', send, type: undefined };
          return pred(ch) ? ch : undefined;
        }),
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

// ============================================
// Mocked functions
// ============================================

const mockRunTsaragAgent = vi.mocked(runTsaragAgent);
const mockIsAdmin = vi.mocked(isAdmin);

let client: ReturnType<typeof makeClient>;

// ============================================
// Test suite
// ============================================

describe('admin-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
    _clearStateForTesting(); // CRITICAL: prevents conversation state leaks

    // Default: treat message sender as admin
    mockIsAdmin.mockReturnValue(true);

    // Default agent response
    mockRunTsaragAgent.mockResolvedValue(defaultTsaragResponse);

    client = makeClient();
    setupAdminHandler(client as unknown as Client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Test 1: Bot messages ignored
  // ============================================

  it('ignores bot messages', async () => {
    const message = new MessageBuilder()
      .asBot()
      .inChannel('админ')
      .inGuild(makeAdminGuild())
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunTsaragAgent).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 2: DM messages ignored (must be guild)
  // ============================================

  it('ignores DM messages (not in a guild)', async () => {
    const message = new MessageBuilder()
      .asDM()
      .withContent('Admin command')
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunTsaragAgent).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 3: Messages outside admin channel ignored
  // ============================================

  it('ignores messages outside the admin channel', async () => {
    const message = new MessageBuilder()
      .withContent('Hello in general')
      .inChannel('general')
      .inGuild(makeAdminGuild())
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunTsaragAgent).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 4: Non-admin user ignored
  // ============================================

  it('ignores messages from non-admin users', async () => {
    mockIsAdmin.mockReturnValue(false);

    const message = new MessageBuilder()
      .withContent('I am not admin')
      .inChannel('админ')
      .inGuild(makeAdminGuild())
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunTsaragAgent).not.toHaveBeenCalled();
  });

  // ============================================
  // Test 5: Admin message in admin channel routed to runTsaragAgent
  // ============================================

  it('routes admin message to runTsaragAgent', async () => {
    const guild = makeAdminGuild();
    const message = new MessageBuilder()
      .withContent('Покажи список студентов')
      .withAuthorId('admin-user-1')
      .inChannel('админ')
      .inGuild(guild)
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunTsaragAgent).toHaveBeenCalledOnce();
    expect(mockRunTsaragAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Покажи список студентов' }),
        ]),
      })
    );
    // Response sent via channel.send() (not message.reply())
    expect((message.channel as unknown as { send: unknown }).send).toHaveBeenCalledWith('Bien recu.');
  });

  // ============================================
  // Test 6: Conversation accumulates across turns (keyed by channelId)
  // ============================================

  it('accumulates conversation messages across turns', async () => {
    const guild = makeAdminGuild();
    mockRunTsaragAgent.mockResolvedValueOnce({
      ...defaultTsaragResponse,
      text: 'Premier reponse.',
      turnMessages: [{ role: 'assistant' as const, content: 'Premier reponse.' }],
    });
    mockRunTsaragAgent.mockResolvedValueOnce({
      ...defaultTsaragResponse,
      text: 'Deuxieme reponse.',
    });

    // Build two messages in the SAME channel (same channelId for conversation keying)
    const channelId = 'channel-admin-test';
    const makeMsg = (text: string) =>
      new MessageBuilder()
        .withContent(text)
        .withAuthorId('admin-user-2')
        .inChannel('админ')
        .inGuild(guild)
        .build();

    // Override channel id by building a custom channel
    const msg1 = makeMsg('Premier message');
    const msg2 = makeMsg('Deuxieme message');

    // Ensure both messages share the same channel.id (required for conversation keying)
    // MessageBuilder creates a new channelId each time; override via a shared channel
    const sharedChannel = {
      id: channelId,
      name: 'админ',
      isDMBased: () => false,
      sendTyping: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({ id: 'msg-resp' }),
      messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
    };
    // Monkey-patch channel to share id
    Object.defineProperty(msg1, 'channel', { value: sharedChannel, configurable: true });
    Object.defineProperty(msg2, 'channel', { value: sharedChannel, configurable: true });

    await client.__emit('messageCreate', msg1);
    await drainProcessing();

    await client.__emit('messageCreate', msg2);
    await drainProcessing();

    expect(mockRunTsaragAgent).toHaveBeenCalledTimes(2);

    // Second call's messages should include first user turn + first turn messages + second user turn
    const secondCallArgs = mockRunTsaragAgent.mock.calls[1]![0];
    expect(secondCallArgs.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Premier message' }),
        expect.objectContaining({ role: 'user', content: 'Deuxieme message' }),
      ])
    );
  });

  // ============================================
  // Test 7: Pending action confirmation flow
  // ============================================

  it('passes pending action to subsequent agent call after agent proposes one', async () => {
    const guild = makeAdminGuild();

    const proposedAction = {
      type: 'send_announcement' as const,
      params: { text: 'Bonjour!', mentionStudents: false },
      summary: 'Send announcement to students',
      id: 'action-1',
    };

    // First call: agent proposes an action
    mockRunTsaragAgent.mockResolvedValueOnce({
      ...defaultTsaragResponse,
      text: 'Voulez-vous envoyer cette annonce?',
      proposedAction,
    });

    // Second call: agent executes the action
    mockRunTsaragAgent.mockResolvedValueOnce({
      ...defaultTsaragResponse,
      text: 'Annonce envoyee.',
      pendingConsumed: true,
      executedActionId: 'action-1',
    });

    const sharedChannel = {
      id: 'channel-pending-test',
      name: 'админ',
      isDMBased: () => false,
      sendTyping: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({ id: 'msg-x' }),
      messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
    };

    const msg1 = new MessageBuilder().withContent('Envoyer une annonce').inGuild(guild).build();
    const msg2 = new MessageBuilder().withContent('oui').inGuild(guild).build();

    Object.defineProperty(msg1, 'channel', { value: sharedChannel, configurable: true });
    Object.defineProperty(msg2, 'channel', { value: sharedChannel, configurable: true });

    await client.__emit('messageCreate', msg1);
    await drainProcessing();

    // After first call, pendingAction should be stored
    await client.__emit('messageCreate', msg2);
    await drainProcessing();

    // Second call should receive the pendingAction
    expect(mockRunTsaragAgent).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockRunTsaragAgent.mock.calls[1]![0];
    expect(secondCallArgs.pendingAction).toEqual(proposedAction);
  });

  // ============================================
  // Test 8: discordActions callbacks passed to agent
  // ============================================

  it('passes discordActions object to runTsaragAgent with required callback functions', async () => {
    const guild = makeAdminGuild();
    const message = new MessageBuilder()
      .withContent('Action request')
      .inChannel('админ')
      .inGuild(guild)
      .build();

    await client.__emit('messageCreate', message);
    await drainProcessing();

    expect(mockRunTsaragAgent).toHaveBeenCalledOnce();
    const callArgs = mockRunTsaragAgent.mock.calls[0]![0];

    // Verify discordActions callbacks are present
    expect(callArgs.discordActions).toBeDefined();
    expect(typeof callArgs.discordActions.sendAnnouncement).toBe('function');
    expect(typeof callArgs.discordActions.sendToSessionsForum).toBe('function');
    expect(typeof callArgs.discordActions.dmStudent).toBe('function');
    expect(typeof callArgs.discordActions.archiveForumThread).toBe('function');
    expect(typeof callArgs.discordActions.unarchiveForumThread).toBe('function');
  });

  // ============================================
  // Test 9: Error from runTsaragAgent handled gracefully
  // ============================================

  it('handles runTsaragAgent throwing an error gracefully', async () => {
    const guild = makeAdminGuild();
    mockRunTsaragAgent.mockRejectedValue(new Error('Claude API error'));

    const message = new MessageBuilder()
      .withContent('Faites quelque chose')
      .inChannel('админ')
      .inGuild(guild)
      .build();

    // Should not throw
    await expect(client.__emit('messageCreate', message)).resolves.not.toThrow();
    await drainProcessing();

    // Error reply sent via message.reply (admin-handler uses message.reply for errors)
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining('Erreur')
    );
  });

  // ============================================
  // Test 10: executedActionIds tracked for idempotency
  // ============================================

  it('tracks executedActionIds and resets conversation after action execution', async () => {
    const guild = makeAdminGuild();

    // Agent executes an action and returns executedActionId
    mockRunTsaragAgent.mockResolvedValueOnce({
      ...defaultTsaragResponse,
      text: 'Action effectuee.',
      executedActionId: 'action-exec-1',
      pendingConsumed: true,
    });

    // Second call returns no action
    mockRunTsaragAgent.mockResolvedValueOnce({
      ...defaultTsaragResponse,
      text: 'Quoi dautre?',
    });

    const sharedChannel = {
      id: 'channel-exec-test',
      name: 'админ',
      isDMBased: () => false,
      sendTyping: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({ id: 'msg-y' }),
      messages: { fetch: vi.fn().mockResolvedValue(new Map()) },
    };

    const msg1 = new MessageBuilder().withContent('Execute action').inGuild(guild).build();
    const msg2 = new MessageBuilder().withContent('Suivant').inGuild(guild).build();

    Object.defineProperty(msg1, 'channel', { value: sharedChannel, configurable: true });
    Object.defineProperty(msg2, 'channel', { value: sharedChannel, configurable: true });

    await client.__emit('messageCreate', msg1);
    await drainProcessing();

    await client.__emit('messageCreate', msg2);
    await drainProcessing();

    expect(mockRunTsaragAgent).toHaveBeenCalledTimes(2);

    // Second call should receive executedActionIds containing the first action
    const secondCallArgs = mockRunTsaragAgent.mock.calls[1]![0];
    expect(secondCallArgs.executedActionIds).toBeInstanceOf(Set);
    expect(secondCallArgs.executedActionIds.has('action-exec-1')).toBe(true);
  });
});
