import { z } from 'zod';
import { runResearchAgent } from '../ai/research-agent.js';
import { logger } from '../logger.js';
import type { AgentDefinition, AgentOutput, AgentExecutionContext } from './types.js';
import { registerAgent } from './registry.js';

const ChercheurInputSchema = z.object({
  topic: z.string().min(1),
  details: z.string().optional(),
  includeMemory: z.boolean().optional(),
  chainToArtisan: z.boolean().optional(),
  slideCount: z.number().optional(),
});

type ChercheurInput = z.infer<typeof ChercheurInputSchema>;

async function execute(input: unknown, ctx: AgentExecutionContext): Promise<AgentOutput> {
  const params = ChercheurInputSchema.parse(input);

  logger.info({ topic: params.topic, jobId: ctx.jobId }, 'Chercheur: starting research');

  const result = await runResearchAgent({
    topic: params.topic,
    details: params.details ?? '',
    includeMemory: params.includeMemory,
  });

  logger.info(
    { topic: params.topic, contentLength: result.content.length },
    'Chercheur: research completed'
  );

  // If chainToArtisan is set, chain the output to the Artisan agent
  if (params.chainToArtisan) {
    return {
      text: result.content,
      chainTo: {
        agentName: 'artisan',
        input: {
          topic: params.topic,
          sourceResearch: result.content,
          slideCount: params.slideCount ?? 10,
        },
      },
    };
  }

  return {
    text: result.content,
  };
}

export const chercheurAgent: AgentDefinition = {
  name: 'chercheur',
  displayName: 'Chercheur',
  description: 'Agent de recherche approfondie — wrapper du Research Agent existant',
  allowedRoles: ['admin', 'mentor'],
  inputSchema: ChercheurInputSchema,
  execute,
};

export function registerChercheur(): void {
  registerAgent(chercheurAgent);
}
