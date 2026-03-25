// Handles only Supabase lifecycle (bot lifecycle is in setup.e2e.ts setupFile)
export async function setup(): Promise<void> {
  // Supabase start + db reset
  const { setup: supabaseSetup } = await import('../globalSetup.js');
  await supabaseSetup();
}

export async function teardown(): Promise<void> {
  // Supabase teardown is no-op (keep running)
}
