// Types
export type {
  CallerRole,
  AgentOrigin,
  AgentOutput,
  AgentOutputFile,
  AgentExecutionContext,
  AgentDefinition,
  AgentJobStatus,
  AgentJob,
  NewAgentJob,
} from './types.js';
export { AgentOriginSchema, InvokeAgentDataSchema } from './types.js';

// Registry
export { registerAgent, getAgent, listAgents, invoke } from './registry.js';

// Permissions
export { canInvoke, resolveRole } from './permissions.js';

// DB operations
export {
  createAgentJob,
  getPendingJobs,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  getJob,
} from './db.js';

// Job processor
export { processAgentJobs, downloadFromStorage } from './job-processor.js';

// Agents
export { registerArtisan } from './artisan/index.js';
export { registerChercheur } from './chercheur.js';
