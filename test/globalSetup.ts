import { execSync } from 'node:child_process';

export async function setup(): Promise<void> {
  console.log('[integration] Starting Supabase local stack...');
  try {
    execSync('supabase start', { stdio: 'pipe', timeout: 120_000 });
  } catch {
    // Already running — acceptable. CLI exits non-zero if already started.
  }
  console.log('[integration] Resetting DB (applying all migrations)...');
  execSync('supabase db reset', { stdio: 'inherit', timeout: 60_000 });
  console.log('[integration] Supabase ready.');
}

export async function teardown(): Promise<void> {
  // Keep running for dev speed. Stop manually with `supabase stop`.
}
