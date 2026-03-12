import { askClaude } from './client.js';
import { buildContext } from './context-builder.js';
import { logger } from '../logger.js';

export interface ResearchSection {
  heading: string;
  content: string;
}

export interface ResearchResult {
  title: string;
  summary: string;
  sections: ResearchSection[];
  recommendations: string[];
  sources: string[];
}

const RESEARCH_PROMPT = `Tu es un agent de recherche expert. Tu dois produire un document de recherche approfondi et structure.

SUJET DE RECHERCHE :
{topic}

DETAILS SUPPLEMENTAIRES :
{details}

{memory_context}

INSTRUCTIONS :
- Fais une analyse approfondie et detaillee du sujet
- Structure ta reponse en sections claires
- Inclus des donnees concretes, des chiffres, des exemples quand c'est pertinent
- Donne des recommandations actionables
- Cite des sources fiables quand possible
- Sois exhaustif mais organise
- Ecris en francais

REPONDS UNIQUEMENT EN JSON VALIDE (pas de markdown, pas de \`\`\`, juste le JSON brut) :
{
  "title": "Titre du document de recherche",
  "summary": "Resume executif en 3-5 phrases",
  "sections": [
    {
      "heading": "Titre de la section",
      "content": "Contenu detaille de la section. Plusieurs paragraphes separes par des retours a la ligne."
    }
  ],
  "recommendations": [
    "Recommandation 1",
    "Recommandation 2"
  ],
  "sources": [
    "Source 1",
    "Source 2"
  ]
}

IMPORTANT : Genere au minimum 4 sections detaillees. Chaque section doit contenir au moins 2-3 paragraphes. Le JSON doit etre valide et parsable.`;

function extractJSON(raw: string): string {
  let text = raw.trim();

  // Remove markdown code blocks
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }

  // Try to find JSON object boundaries
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}

function buildFallbackResult(topic: string, rawText: string): ResearchResult {
  // If JSON parsing fails, create a structured result from raw text
  const paragraphs = rawText.split('\n\n').filter((p) => p.trim().length > 20);

  const sections: ResearchSection[] = [];
  let currentSection: ResearchSection | null = null;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    // Detect headers (short lines, often with # or all caps or ending with :)
    if (trimmed.length < 100 && (trimmed.startsWith('#') || trimmed.endsWith(':') || trimmed === trimmed.toUpperCase())) {
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed.replace(/^#+\s*/, '').replace(/:$/, ''), content: '' };
    } else if (currentSection) {
      currentSection.content += (currentSection.content ? '\n\n' : '') + trimmed;
    } else {
      currentSection = { heading: 'Introduction', content: trimmed };
    }
  }
  if (currentSection) sections.push(currentSection);

  // If we couldn't extract sections, put everything in one
  if (sections.length === 0) {
    sections.push({ heading: 'Analyse', content: rawText.slice(0, 5000) });
  }

  return {
    title: `Recherche : ${topic}`,
    summary: sections[0]?.content.slice(0, 300) ?? topic,
    sections,
    recommendations: [],
    sources: [],
  };
}

export async function runResearchAgent(params: {
  topic: string;
  details: string;
  includeMemory?: boolean;
}): Promise<ResearchResult> {
  logger.info({ topic: params.topic }, 'Starting research agent');

  let memoryContext = '';
  if (params.includeMemory) {
    try {
      const context = await buildContext();
      memoryContext = `CONTEXTE PERSONNEL (utilise si pertinent) :\n${context}`;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'Failed to build context for research');
    }
  }

  const prompt = RESEARCH_PROMPT
    .replace('{topic}', params.topic)
    .replace('{details}', params.details || 'Aucun detail supplementaire.')
    .replace('{memory_context}', memoryContext);

  const response = await askClaude({
    prompt: 'Genere le document de recherche complet.',
    systemPrompt: prompt,
    model: 'sonnet',
    maxTokens: 8192,
  });

  logger.info({ responseLength: response.length }, 'Research agent got response from Claude');

  // Try JSON parsing with fallback
  let result: ResearchResult;

  try {
    const jsonString = extractJSON(response);
    result = JSON.parse(jsonString) as ResearchResult;
  } catch (parseError) {
    logger.warn(
      { err: parseError instanceof Error ? parseError.message : 'JSON parse failed' },
      'Research agent JSON parse failed, using fallback'
    );
    result = buildFallbackResult(params.topic, response);
  }

  // Validate required fields
  if (!result.title) result.title = `Recherche : ${params.topic}`;
  if (!result.summary) result.summary = params.topic;
  if (!result.sections || result.sections.length === 0) {
    result.sections = [{ heading: 'Analyse', content: response.slice(0, 5000) }];
  }
  if (!result.recommendations) result.recommendations = [];
  if (!result.sources) result.sources = [];

  logger.info(
    { title: result.title, sections: result.sections.length },
    'Research agent completed'
  );

  return result;
}
