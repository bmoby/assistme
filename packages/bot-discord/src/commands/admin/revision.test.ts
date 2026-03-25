import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleRevision } from './revision.js';
import {
  searchStudentByName,
  getExercisesByStudent,
  updateExerciseStatus,
} from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import { createStudent as createStudentFixture, createExercise as createExerciseFixture } from '../../__mocks__/fixtures/domain/index.js';

// ============================================
// Typed mocks
// ============================================

const mockedSearchStudentByName = searchStudentByName as MockedFunction<typeof searchStudentByName>;
const mockedGetExercisesByStudent = getExercisesByStudent as MockedFunction<typeof getExercisesByStudent>;
const mockedUpdateExerciseStatus = updateExerciseStatus as MockedFunction<typeof updateExerciseStatus>;

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

describe('handleRevision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .withStringOption('студент', 'Alice')
      .withStringOption('отзыв', 'Please improve the structure.')
      .build();

    await handleRevision(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
    expect(mockedSearchStudentByName).not.toHaveBeenCalled();
  });

  it('replies with error when student not found', async () => {
    mockedSearchStudentByName.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Unknown')
      .withStringOption('отзыв', 'Please fix.')
      .build();

    await handleRevision(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('не найден') })
    );
    expect(mockedUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  it('replies with error when no pending exercises', async () => {
    const studentFixture = createStudentFixture({ name: 'Alice' });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Alice')
      .withStringOption('отзыв', 'Please fix.')
      .build();

    await handleRevision(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('нет заданий') })
    );
    expect(mockedUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  it('happy path: requests revision with feedback', async () => {
    const studentFixture = createStudentFixture({ name: 'Alice', discord_id: null });
    const exerciseFixture = createExerciseFixture({
      status: 'submitted',
      student_id: studentFixture.id,
    });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([exerciseFixture]);
    mockedUpdateExerciseStatus.mockResolvedValue(exerciseFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Alice')
      .withStringOption('отзыв', 'Please improve the structure and add more examples.')
      .build();

    await handleRevision(interaction);

    expect(mockedUpdateExerciseStatus).toHaveBeenCalledWith(
      exerciseFixture.id,
      'revision_needed',
      'Please improve the structure and add more examples.'
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Доработка') })
    );
  });

  it('prompts to specify session when multiple pending exercises', async () => {
    const studentFixture = createStudentFixture({ name: 'Bob' });
    const exercise1 = createExerciseFixture({ status: 'submitted', exercise_number: 1 });
    const exercise2 = createExerciseFixture({ status: 'submitted', exercise_number: 2 });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([exercise1, exercise2]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Bob')
      .withStringOption('отзыв', 'Fix all issues.')
      .build();

    await handleRevision(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('сессия') })
    );
    expect(mockedUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    mockedSearchStudentByName.mockRejectedValue(new Error('DB error'));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Charlie')
      .withStringOption('отзыв', 'Fix it.')
      .build();

    await handleRevision(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Ошибка') })
    );
  });
});
