import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

/**
 * Create an admin Supabase client for test fixture management.
 * Uses service-role key to bypass RLS.
 * persistSession: false prevents auth state bleed between test files.
 */
export function createTestClient(): SupabaseClient {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for integration tests');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Generate a unique test run ID for data prefixing.
 * Use this to prefix source_file, name, etc. for cleanup.
 */
export function createTestRunId(): string {
  return `test-intg-${randomUUID()}`;
}

/**
 * Clean up all rows in a table where a column matches the test run prefix.
 * Call in afterAll() to prevent data leakage between test files.
 */
export async function cleanupTestData(
  client: SupabaseClient,
  table: string,
  column: string,
  runId: string
): Promise<void> {
  const { error } = await client
    .from(table)
    .delete()
    .like(column, `${runId}%`);
  if (error) {
    console.warn(`[cleanup] Failed to clean ${table}.${column} for ${runId}:`, error.message);
  }
}
