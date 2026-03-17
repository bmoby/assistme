import { getSupabase } from '../db/client.js';
import type { AgentJob, AgentOrigin } from './types.js';
import { logger } from '../logger.js';

const TABLE = 'agent_jobs';

export async function createAgentJob(params: {
  agentName: string;
  input: Record<string, unknown>;
  origin: AgentOrigin;
  chainTo?: { agentName: string; input: Record<string, unknown> } | null;
  parentJobId?: string | null;
}): Promise<AgentJob> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .insert({
      agent_name: params.agentName,
      input: params.input,
      origin: params.origin,
      status: 'pending',
      result_text: null,
      result_files: [],
      chain_to: params.chainTo ?? null,
      error: null,
      parent_job_id: params.parentJobId ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, agentName: params.agentName }, 'Failed to create agent job');
    throw error;
  }
  return data as AgentJob;
}

export async function getPendingJobs(limit = 5): Promise<AgentJob[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error({ error }, 'Failed to get pending agent jobs');
    throw error;
  }
  return (data ?? []) as AgentJob[];
}

/** Recover zombie jobs stuck in 'processing' for more than 5 minutes */
export async function recoverZombieJobs(): Promise<number> {
  const db = getSupabase();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from(TABLE)
    .update({
      status: 'failed',
      error: 'Job stuck in processing (timeout after 5 minutes)',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'processing')
    .lt('started_at', fiveMinutesAgo)
    .select('id');

  if (error) {
    logger.error({ error }, 'Failed to recover zombie agent jobs');
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    logger.warn({ count }, 'Recovered zombie agent jobs');
  }
  return count;
}

export async function markJobProcessing(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to mark job as processing');
    throw error;
  }
}

export async function markJobCompleted(
  id: string,
  result: {
    text?: string;
    files?: Array<{ storage_path: string; filename: string; mime_type: string }>;
  }
): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .update({
      status: 'completed',
      result_text: result.text ?? null,
      result_files: result.files ?? [],
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to mark job as completed');
    throw error;
  }
}

export async function markJobFailed(id: string, errorMsg: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from(TABLE)
    .update({
      status: 'failed',
      error: errorMsg,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    logger.error({ error, id }, 'Failed to mark job as failed');
    throw error;
  }
}

export async function getJob(id: string): Promise<AgentJob | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from(TABLE)
    .select()
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error({ error, id }, 'Failed to get agent job');
    throw error;
  }
  return data as AgentJob;
}
