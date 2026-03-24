import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleAddStudent } from './add-student.js';
import { createStudent } from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import { createStudent as createStudentFixture } from '../../__mocks__/fixtures/domain/index.js';

// ============================================
// Typed mocks
// ============================================

const mockedCreateStudent = createStudent as MockedFunction<typeof createStudent>;

// ============================================
// Helpers
// ============================================

function makeAdminMember() {
  return new GuildMemberBuilder().withRole({ name: 'tsarag' }).build();
}

function makeNonAdminMember() {
  return new GuildMemberBuilder().withRole({ name: 'visitor' }).build();
}

// ============================================
// Tests
// ============================================

describe('handleAddStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .withStringOption('имя', 'Alice')
      .build();

    await handleAddStudent(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
    expect(mockedCreateStudent).not.toHaveBeenCalled();
  });

  it('happy path: creates student without Discord link and replies with success', async () => {
    const studentFixture = createStudentFixture({ name: 'Alice Dupont', discord_id: null });
    mockedCreateStudent.mockResolvedValue(studentFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('имя', 'Alice Dupont')
      .build();

    await handleAddStudent(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(mockedCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alice Dupont',
        status: 'paid',
        payment_status: 'paid',
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Alice Dupont') })
    );
  });

  it('creates student with pod_id when provided', async () => {
    const studentFixture = createStudentFixture({ name: 'Bob Martin', pod_id: 3 });
    mockedCreateStudent.mockResolvedValue(studentFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('имя', 'Bob Martin')
      .withIntegerOption('под', 3)
      .build();

    await handleAddStudent(interaction);

    expect(mockedCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bob Martin', pod_id: 3 })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Bob Martin') })
    );
  });

  it('handles createStudent throwing an error', async () => {
    mockedCreateStudent.mockRejectedValue(new Error('DB constraint error'));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('имя', 'Charlie Error')
      .build();

    await handleAddStudent(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка')
    );
  });
});
