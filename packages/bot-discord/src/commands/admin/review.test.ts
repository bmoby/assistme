import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

vi.mock('@assistme/core');

import { handleReview } from './review.js';
import {
  getPendingExercises,
  getPendingExercisesBySession,
  getSessionByNumber,
  searchStudentByName,
  getExercisesByStudent,
  getAttachmentsByExercise,
  getStudent,
} from '@assistme/core';
import { CommandInteractionBuilder, GuildMemberBuilder, resetSeq } from '../../__mocks__/discord/builders.js';
import {
  createExercise as createExerciseFixture,
  createStudent as createStudentFixture,
  createSession as createSessionFixture,
} from '../../__mocks__/fixtures/domain/index.js';

// ============================================
// Typed mocks
// ============================================

const mockedGetPendingExercises = getPendingExercises as MockedFunction<typeof getPendingExercises>;
const mockedGetPendingExercisesBySession = getPendingExercisesBySession as MockedFunction<typeof getPendingExercisesBySession>;
const mockedGetSessionByNumber = getSessionByNumber as MockedFunction<typeof getSessionByNumber>;
const mockedSearchStudentByName = searchStudentByName as MockedFunction<typeof searchStudentByName>;
const mockedGetExercisesByStudent = getExercisesByStudent as MockedFunction<typeof getExercisesByStudent>;
const mockedGetAttachmentsByExercise = getAttachmentsByExercise as MockedFunction<typeof getAttachmentsByExercise>;
const mockedGetStudent = getStudent as MockedFunction<typeof getStudent>;

// ============================================
// Helpers
// ============================================

function makeAdminMember() {
  return new GuildMemberBuilder().withRole({ name: 'tsarag' }).build();
}

function makeMentorMember() {
  return new GuildMemberBuilder().withRole({ name: 'mentor' }).build();
}

function makeNonPrivilegedMember() {
  return new GuildMemberBuilder().withRole({ name: 'visitor' }).build();
}

// ============================================
// Tests
// ============================================

describe('handleReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSeq();
  });

  it('rejects users with no admin/mentor role', async () => {
    const interaction = new CommandInteractionBuilder()
      .withMember(makeNonPrivilegedMember())
      .build();

    await handleReview(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('тренеру и менторам') })
    );
    expect(mockedGetPendingExercises).not.toHaveBeenCalled();
  });

  it('allows mentor to use the command', async () => {
    mockedGetPendingExercises.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeMentorMember())
      .build();

    await handleReview(interaction);

    // Should reach the global overview path (no session, no student filters)
    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(mockedGetPendingExercises).toHaveBeenCalled();
  });

  it('replies with "no pending exercises" when global list is empty', async () => {
    mockedGetPendingExercises.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleReview(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Нет заданий') })
    );
  });

  it('happy path: returns global exercise list grouped by session', async () => {
    const exercise1 = createExerciseFixture({ exercise_number: 1, status: 'submitted' });
    const exercise2 = createExerciseFixture({ exercise_number: 1, status: 'submitted' });
    mockedGetPendingExercises.mockResolvedValue([exercise1, exercise2]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleReview(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) })
    );
  });

  it('happy path: returns exercises by session number', async () => {
    const sessionFixture = createSessionFixture({ session_number: 3 });
    const studentFixture = createStudentFixture({ name: 'Alice' });
    const exerciseFixture = createExerciseFixture({
      status: 'submitted',
      student_id: studentFixture.id,
      exercise_number: 3,
    });
    mockedGetPendingExercisesBySession.mockResolvedValue([exerciseFixture]);
    mockedGetSessionByNumber.mockResolvedValue(sessionFixture);
    mockedGetStudent.mockResolvedValue(studentFixture);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('сессия', 3)
      .build();

    await handleReview(interaction);

    expect(mockedGetPendingExercisesBySession).toHaveBeenCalledWith(3);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) })
    );
  });

  it('replies with no pending message when session has no exercises', async () => {
    mockedGetPendingExercisesBySession.mockResolvedValue([]);
    mockedGetSessionByNumber.mockResolvedValue(createSessionFixture({ session_number: 5 }));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withIntegerOption('сессия', 5)
      .build();

    await handleReview(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('5') })
    );
  });

  it('returns exercises by student name', async () => {
    const studentFixture = createStudentFixture({ name: 'Bob' });
    const exerciseFixture = createExerciseFixture({
      status: 'submitted',
      student_id: studentFixture.id,
    });
    mockedSearchStudentByName.mockResolvedValue([studentFixture]);
    mockedGetExercisesByStudent.mockResolvedValue([exerciseFixture]);
    mockedGetAttachmentsByExercise.mockResolvedValue([]);

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .withStringOption('студент', 'Bob')
      .build();

    await handleReview(interaction);

    expect(mockedSearchStudentByName).toHaveBeenCalledWith('Bob');
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) })
    );
  });

  it('handles errors gracefully', async () => {
    mockedGetPendingExercises.mockRejectedValue(new Error('DB error'));

    const interaction = new CommandInteractionBuilder()
      .withMember(makeAdminMember())
      .build();

    await handleReview(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Ошибка') })
    );
  });
});
