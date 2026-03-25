import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleStudentList } from './student-list.js';
import { getStudentsBySession } from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import { createStudent as createStudentFixture } from '../../__mocks__/fixtures/domain/index.js';

// ============================================
// Typed mocks
// ============================================

const mockedGetStudentsBySession = getStudentsBySession as MockedFunction<typeof getStudentsBySession>;

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

describe('handleStudentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .build();

    await handleStudentList(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
    expect(mockedGetStudentsBySession).not.toHaveBeenCalled();
  });

  it('replies with no students message when list is empty', async () => {
    mockedGetStudentsBySession.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleStudentList(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Нет зарегистрированных студентов'),
        ephemeral: true,
      })
    );
  });

  it('happy path: returns student list as embed', async () => {
    const student1 = createStudentFixture({ name: 'Alice', status: 'active' });
    const student2 = createStudentFixture({ name: 'Bob', status: 'paid' });
    mockedGetStudentsBySession.mockResolvedValue([student1, student2]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleStudentList(interaction);

    expect(mockedGetStudentsBySession).toHaveBeenCalledWith(2);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array), ephemeral: true })
    );
  });

  it('embed description contains student names', async () => {
    const student1 = createStudentFixture({ name: 'Alice Martin', status: 'active' });
    const student2 = createStudentFixture({ name: 'Charlie Doe', status: 'paid' });
    mockedGetStudentsBySession.mockResolvedValue([student1, student2]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleStudentList(interaction);

    const callArg = (interaction.reply as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      embeds: Array<{ data?: { description?: string } }>;
    };
    const embedDescription = callArg?.embeds?.[0]?.data?.description ?? '';
    expect(embedDescription).toContain('Alice Martin');
    expect(embedDescription).toContain('Charlie Doe');
  });

  it('handles getStudentsBySession error gracefully', async () => {
    mockedGetStudentsBySession.mockRejectedValue(new Error('DB error'));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleStudentList(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Ошибка') })
    );
  });
});
