import { z } from 'zod';
import { askClaude } from '../../ai/client.js';
import { logger } from '../../logger.js';
import type { AgentDefinition, AgentOutput, AgentExecutionContext } from '../types.js';
import { registerAgent } from '../registry.js';
import { ARTISAN_SYSTEM_PROMPT, buildArtisanPrompt } from './prompt.js';
import { buildPptx } from './pptx-builder.js';

const ArtisanInputSchema = z.object({
  topic: z.string().min(1),
  slideCount: z.number().min(1).max(50).optional(),
  details: z.string().optional(),
  sourceResearch: z.string().optional(),
  language: z.string().optional(),
});

type ArtisanInput = z.infer<typeof ArtisanInputSchema>;

async function execute(input: unknown, ctx: AgentExecutionContext): Promise<AgentOutput> {
  const params = ArtisanInputSchema.parse(input);

  logger.info({ topic: params.topic, jobId: ctx.jobId }, 'Artisan: generating presentation');

  // Step 1: Ask Claude to structure content as JSON slides
  const prompt = buildArtisanPrompt(params);
  const response = await askClaude({
    prompt,
    systemPrompt: ARTISAN_SYSTEM_PROMPT,
    model: 'sonnet',
    maxTokens: 8192,
  });

  // Parse Claude's JSON response
  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let presentationData: { title: string; subtitle?: string; slides: Array<{ title: string; bullets: string[]; notes?: string }> };
  try {
    presentationData = JSON.parse(jsonString);
  } catch {
    logger.error({ response: jsonString.slice(0, 500) }, 'Artisan: failed to parse Claude response as JSON');
    throw new Error('Failed to parse presentation structure from Claude');
  }

  // Step 2: Generate PPTX
  const buffer = await buildPptx(presentationData);

  const filename = `${presentationData.title.slice(0, 50).replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '').trim().replace(/\s+/g, '-')}.pptx`;

  logger.info(
    { topic: params.topic, slides: presentationData.slides.length, fileSize: buffer.length },
    'Artisan: presentation generated'
  );

  return {
    text: `Presentation "${presentationData.title}" generee (${presentationData.slides.length} slides)`,
    files: [{
      filename,
      buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }],
  };
}

export const artisanAgent: AgentDefinition = {
  name: 'artisan',
  displayName: 'Artisan',
  description: 'Generateur de presentations PPTX professionnelles',
  allowedRoles: ['admin', 'mentor'],
  inputSchema: ArtisanInputSchema,
  execute,
};

export function registerArtisan(): void {
  registerAgent(artisanAgent);
}
