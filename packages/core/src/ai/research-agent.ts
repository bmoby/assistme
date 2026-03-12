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

REPONDS UNIQUEMENT EN JSON (pas de markdown autour) :
{
  "title": "Titre du document de recherche",
  "summary": "Resume executif en 3-5 phrases",
  "sections": [
    {
      "heading": "Titre de la section",
      "content": "Contenu detaille de la section (plusieurs paragraphes si necessaire)"
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

Genere au minimum 4 sections detaillees. Chaque section doit contenir au moins 2-3 paragraphes.`;

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
    } catch {
      // ignore
    }
  }

  const prompt = RESEARCH_PROMPT
    .replace('{topic}', params.topic)
    .replace('{details}', params.details || 'Aucun detail supplementaire.')
    .replace('{memory_context}', memoryContext);

  const response = await askClaude({
    prompt: 'Genere le document de recherche.',
    systemPrompt: prompt,
    model: 'sonnet',
    maxTokens: 8192,
  });

  let jsonString = response.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const result = JSON.parse(jsonString) as ResearchResult;

  logger.info(
    { title: result.title, sections: result.sections.length },
    'Research agent completed'
  );

  return result;
}
