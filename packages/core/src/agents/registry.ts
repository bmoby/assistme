import type { AgentDefinition, AgentOrigin, AgentJob } from './types.js';
import { canInvoke } from './permissions.js';
import { createAgentJob } from './db.js';
import { logger } from '../logger.js';

const agents = new Map<string, AgentDefinition>();

export function registerAgent(agent: AgentDefinition): void {
  if (agents.has(agent.name)) {
    logger.warn({ name: agent.name }, 'Agent already registered, overwriting');
  }
  agents.set(agent.name, agent);
  logger.info({ name: agent.name, displayName: agent.displayName }, 'Agent registered');
}

export function getAgent(name: string): AgentDefinition | undefined {
  return agents.get(name);
}

export function listAgents(): AgentDefinition[] {
  return Array.from(agents.values());
}

export async function invoke(
  agentName: string,
  input: Record<string, unknown>,
  origin: AgentOrigin,
  options?: { chainTo?: { agentName: string; input: Record<string, unknown> }; parentJobId?: string }
): Promise<AgentJob> {
  const agent = agents.get(agentName);
  if (!agent) {
    throw new Error(`Agent "${agentName}" not found. Available: ${Array.from(agents.keys()).join(', ')}`);
  }

  // Permission check
  if (!canInvoke(agent, origin.callerRole)) {
    throw new Error(`Role "${origin.callerRole}" is not allowed to invoke agent "${agentName}"`);
  }

  // Validate input with Zod
  const parsed = agent.inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid input for agent "${agentName}": ${parsed.error.message}`);
  }

  // Create job in DB
  const job = await createAgentJob({
    agentName,
    input: parsed.data as Record<string, unknown>,
    origin,
    chainTo: options?.chainTo ?? null,
    parentJobId: options?.parentJobId ?? null,
  });

  logger.info(
    { jobId: job.id, agentName, origin: origin.platform },
    'Agent job created'
  );

  return job;
}
