import { z } from 'zod';

// ============================================
// Caller Role — unified across all bots
// ============================================

export type CallerRole = 'admin' | 'mentor' | 'student' | 'public';

// ============================================
// Agent Origin — where the request came from
// ============================================

export interface AgentOrigin {
  platform: 'telegram' | 'discord' | 'system';
  chatId: string;
  messageId?: string;
  callerRole: CallerRole;
}

export const AgentOriginSchema = z.object({
  platform: z.enum(['telegram', 'discord', 'system']),
  chatId: z.string(),
  messageId: z.string().optional(),
  callerRole: z.enum(['admin', 'mentor', 'student', 'public']),
});

// ============================================
// Agent Output — what an agent returns
// ============================================

export interface AgentOutputFile {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  storagePath?: string;
}

export interface AgentOutput {
  text?: string;
  files?: AgentOutputFile[];
  chainTo?: { agentName: string; input: Record<string, unknown> };
}

// ============================================
// Agent Execution Context
// ============================================

export interface AgentExecutionContext {
  jobId: string;
  origin: AgentOrigin;
  parentJobId?: string;
}

// ============================================
// Agent Definition — how an agent registers
// ============================================

export interface AgentDefinition {
  name: string;
  displayName: string;
  description: string;
  allowedRoles: CallerRole[];
  inputSchema: z.ZodType;
  execute: (input: unknown, ctx: AgentExecutionContext) => Promise<AgentOutput>;
}

// ============================================
// Agent Job — DB record
// ============================================

export type AgentJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AgentJob {
  id: string;
  agent_name: string;
  input: Record<string, unknown>;
  origin: AgentOrigin;
  status: AgentJobStatus;
  result_text: string | null;
  result_files: Array<{ storage_path: string; filename: string; mime_type: string }>;
  chain_to: { agentName: string; input: Record<string, unknown> } | null;
  error: string | null;
  parent_job_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export type NewAgentJob = Omit<AgentJob, 'id' | 'created_at' | 'started_at' | 'completed_at'>;

// ============================================
// Zod schemas for invoke_agent orchestrator action
// ============================================

export const InvokeAgentDataSchema = z.object({
  agent_name: z.string(),
  input: z.record(z.unknown()).default({}),
});
