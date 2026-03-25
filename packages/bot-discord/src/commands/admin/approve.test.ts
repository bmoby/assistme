import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleApprove } from './approve.js';
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

describe('handleApprove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects non-admin users', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonAdminMember())
      .withStringOption('студент', 'Alice')
      .build();

    await handleApprove(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру'), ephemeral: true })
    );
    expect(mockedSearchStudentByName).not.toHaveBeenCalled();
  });

  it('replies with error when student not found', async () => {
    mockedSearchStudentByName.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Unknown Student')
      .build();

    await handleApprove(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('не найден') })
    );
    expect(mockedUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  it('replies with error when student has no pending exercises', async () => {
    const studentFixture = createStudentFixture({ name: 'Alice' });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Alice')
      .build();

    await handleApprove(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('нет заданий') })
    );
    expect(mockedUpdateExerciseStatus).not.toHaveBeenCalled();
  });

  it('happy path: approves pending exercise', async () => {
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
      .build();

    await handleApprove(interaction);

    expect(mockedUpdateExerciseStatus).toHaveBeenCalledWith(
      exerciseFixture.id,
      'approved',
      undefined
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('одобрено') })
    );
  });

  it('approves with feedback when provided', async () => {
    const studentFixture = createStudentFixture({ name: 'Bob', discord_id: null });
    const exerciseFixture = createExerciseFixture({
      status: 'ai_reviewed',
      student_id: studentFixture.id,
    });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([exerciseFixture]);
    mockedUpdateExerciseStatus.mockResolvedValue(exerciseFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Bob')
      .withStringOption('отзыв', 'Excellent work!')
      .build();

    await handleApprove(interaction);

    expect(mockedUpdateExerciseStatus).toHaveBeenCalledWith(
      exerciseFixture.id,
      'approved',
      'Excellent work!'
    );
  });

  it('prompts to specify session when multiple pending exercises', async () => {
    const studentFixture = createStudentFixture({ name: 'Charlie', discord_id: null });
    const exercise1 = createExerciseFixture({ status: 'submitted', exercise_number: 1, student_id: studentFixture.id });
    const exercise2 = createExerciseFixture({ status: 'submitted', exercise_number: 2, student_id: studentFixture.id });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([exercise1, exercise2]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Charlie')
      .build();

    await handleApprove(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('сессия') })
    );
    expect(mockedUpdateExerciseStatus).not.toHaveBeenCalled();
  });
});
