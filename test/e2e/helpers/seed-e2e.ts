import { createTestClient, createTestRunId, cleanupTestData } from '../../integration-helpers.js';

export interface SeedResult {
  runId: string;
  studentId: string;
}

export async function seedTestStudent(discordUserId: string): Promise<SeedResult> {
  const db = createTestClient();
  const runId = createTestRunId();

  const { data, error } = await db.from('students').upsert({
    name: `E2E Student ${runId}`,
    discord_id: discordUserId,
    pod_id: 1,
  }, { onConflict: 'discord_id' }).select('id').single();

  if (error) throw new Error(`E2E student seed failed: ${error.message}`);
  return { runId, studentId: data.id };
}

export async function cleanupTestStudent(runId: string): Promise<void> {
  const db = createTestClient();
  await cleanupTestData(db, 'students', 'name', runId);
}
