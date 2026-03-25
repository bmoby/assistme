import { execSync } from 'node:child_process';

export async function setup(): Promise<void> {
  console.log('[integration] Starting Supabase local stack...');
  try {
    execSync('supabase start', { stdio: 'pipe', timeout: 120_000 });
  } catch {
    // Already running — acceptable. CLI exits non-zero if already started.
  }
  console.log('[integration] Resetting DB (applying all migrations)...');
  try {
    execSync('supabase db reset', { stdio: 'inherit', timeout: 120_000 });
  } catch {
    // supabase db reset can exit non-zero due to transient 502 during container restart
    // even though migrations applied successfully. Verify DB is reachable instead.
    console.log('[integration] db reset exited with error — verifying DB is reachable...');
    execSync('supabase status', { stdio: 'pipe', timeout: 10_000 });
  }
  console.log('[integration] Supabase ready.');
}

export async function teardown(): Promise<void> {
  // Keep running for dev speed. Stop manually with `supabase stop`.
}
