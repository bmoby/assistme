import { describe, it, expect, afterAll } from 'vitest';
import {
  createStudent,
  getStudent,
  getStudentByDiscordId,
  updateStudent,
  searchStudentByName,
} from './students.js';
import {
  createTestClient,
  createTestRunId,
  cleanupTestData,
} from '../../../../../test/integration-helpers.js';

const TEST_RUN_ID = createTestRunId();
const adminDb = createTestClient();

afterAll(async () => {
  await cleanupTestData(adminDb, 'students', 'name', TEST_RUN_ID);
});

describe('students DB integration', () => {
  let createdStudentId: string;

  it('createStudent inserts a row and returns it with generated id', async () => {
    const student = await createStudent({
      name: `${TEST_RUN_ID}-Alice`,
      discord_id: `discord-${TEST_RUN_ID}`,
      session: 2,
      status: 'registered',
    });
    createdStudentId = student.id;
    expect(student.id).toBeDefined();
    expect(student.name).toBe(`${TEST_RUN_ID}-Alice`);
    expect(student.status).toBe('registered');
    expect(student.session).toBe(2);
  });

  it('getStudent retrieves a student by id', async () => {
    const student = await getStudent(createdStudentId);
    expect(student).not.toBeNull();
    expect(student!.name).toBe(`${TEST_RUN_ID}-Alice`);
  });

  it('getStudent returns null for non-existent id', async () => {
    const student = await getStudent('00000000-0000-0000-0000-000000000000');
    expect(student).toBeNull();
  });

  it('getStudentByDiscordId finds student by discord_id', async () => {
    const student = await getStudentByDiscordId(`discord-${TEST_RUN_ID}`);
    expect(student).not.toBeNull();
    expect(student!.id).toBe(createdStudentId);
  });

  it('updateStudent modifies fields and returns updated row', async () => {
    const updated = await updateStudent(createdStudentId, { status: 'paid' });
    expect(updated.status).toBe('paid');
    expect(updated.id).toBe(createdStudentId);
  });

  it('searchStudentByName finds students by partial name match', async () => {
    const results = await searchStudentByName(TEST_RUN_ID);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.name).toContain(TEST_RUN_ID);
  });
});
