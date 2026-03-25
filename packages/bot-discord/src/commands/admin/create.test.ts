import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleCreate } from './create.js';
import { agents } from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';

// ============================================
// Typed mocks
// ============================================

// agents namespace is auto-mocked — access its methods as MockedFunction
type AgentNS = typeof agents;
const mockedAgentsResolveRole = agents.resolveRole as MockedFunction<AgentNS['resolveRole']>;
const mockedAgentsInvoke = agents.invoke as MockedFunction<AgentNS['invoke']>;
const mockedAgentsGetAgent = agents.getAgent as MockedFunction<AgentNS['getAgent']>;

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

describe('handleCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .withStringOption('agent', 'artisan')
      .withStringOption('тема', 'Introduction to AI')
      .build();

    await handleCreate(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
  });

  it('happy path: invokes agent and replies with confirmation', async () => {
    mockedAgentsResolveRole.mockReturnValue('formateur' as never);
    mockedAgentsInvoke.mockResolvedValue(undefined);
    mockedAgentsGetAgent.mockReturnValue({ displayName: 'Artisan (PPTX)' } as never);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('agent', 'artisan')
      .withStringOption('тема', 'Introduction to AI Agents')
      .withIntegerOption('слайды', 10)
      .build();

    await handleCreate(interaction);

    expect(mockedAgentsInvoke).toHaveBeenCalledWith(
      'artisan',
      expect.objectContaining({ topic: 'Introduction to AI Agents', slideCount: 10 }),
      expect.objectContaining({ platform: 'discord' })
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Artisan (PPTX)'), ephemeral: true })
    );
  });

  it('handles agent invoke error and replies with error message', async () => {
    mockedAgentsResolveRole.mockReturnValue('formateur' as never);
    mockedAgentsInvoke.mockRejectedValue(new Error('Agent failed'));
    mockedAgentsGetAgent.mockReturnValue(null);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('agent', 'artisan')
      .withStringOption('тема', 'Failing topic')
      .build();

    await handleCreate(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Erreur'), ephemeral: true })
    );
  });

  it('invokes agent with details when provided', async () => {
    mockedAgentsResolveRole.mockReturnValue('formateur' as never);
    mockedAgentsInvoke.mockResolvedValue(undefined);
    mockedAgentsGetAgent.mockReturnValue({ displayName: 'Chercheur' } as never);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('agent', 'chercheur')
      .withStringOption('тема', 'Prompt Engineering')
      .withStringOption('детали', 'Focus on chain-of-thought')
      .build();

    await handleCreate(interaction);

    expect(mockedAgentsInvoke).toHaveBeenCalledWith(
      'chercheur',
      expect.objectContaining({ topic: 'Prompt Engineering', details: 'Focus on chain-of-thought' }),
      expect.any(Object)
    );
  });
});
