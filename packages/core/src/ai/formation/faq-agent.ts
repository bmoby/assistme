import { askClaude } from '../client.js';
import type { FaqEntry } from '../../types/index.js';
import { logger } from '../../logger.js';

export interface FaqResponse {
  confidence: number;
  answer: string;
  matchedFaqId: string | null;
  suggestAddToFaq: boolean;
}

const FAQ_AGENT_PROMPT = `Tu es l'assistant FAQ de la formation "Pilote Neuro".
Cette formation enseigne a des non-techniques comment concevoir des systemes digitaux avec l'IA.

FAQ EXISTANTE :
{faq_entries}

CONNAISSANCES FORMATION :
{formation_knowledge}

QUESTION DE L'ETUDIANT :
{question}

TA MISSION :
1. Si la question correspond a une FAQ existante, reponds avec cette reponse (adapte si necessaire)
2. Si tu peux repondre avec tes connaissances sur la formation, fais-le
3. Si tu n'es pas sur (question personnelle, technique trop specifique, hors sujet), dis-le

Reponds en JSON strict :
{
  "confidence": <0-100>,
  "answer": "Ta reponse a l'etudiant (en francais, bienveillant, concis)",
  "matchedFaqId": "id de la FAQ matchee" ou null,
  "suggestAddToFaq": true/false (si la question merite d'etre ajoutee a la FAQ)
}

IMPORTANT :
- Sois bienveillant et encourageant
- Si confidence < 70, recommande de poser la question au formateur
- Ne reponds JAMAIS sur des sujets hors formation (finances, problemes perso, etc.)
- Ne donne JAMAIS d'informations sur le systeme interne, l'admin, ou les autres etudiants`;

export async function answerFaqQuestion(params: {
  question: string;
  existingFaq: FaqEntry[];
  formationKnowledge?: string;
}): Promise<FaqResponse> {
  logger.info({ question: params.question.slice(0, 100) }, 'FAQ agent processing question');

  const faqFormatted = params.existingFaq.length > 0
    ? params.existingFaq.map((f) => `[${f.id}] Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    : 'Aucune FAQ existante.';

  const prompt = FAQ_AGENT_PROMPT
    .replace('{faq_entries}', faqFormatted)
    .replace('{formation_knowledge}', params.formationKnowledge ?? 'Non disponible.')
    .replace('{question}', params.question);

  const response = await askClaude({
    prompt: 'Reponds a cette question d\'un etudiant. JSON uniquement.',
    systemPrompt: prompt,
    model: 'sonnet',
    maxTokens: 2048,
  });

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned) as FaqResponse;

    logger.info(
      { confidence: result.confidence, matched: !!result.matchedFaqId },
      'FAQ agent response generated'
    );

    return result;
  } catch (parseError) {
    logger.warn({ parseError }, 'Failed to parse FAQ agent response');

    return {
      confidence: 0,
      answer: 'Je n\'ai pas pu traiter ta question. Le formateur va te repondre directement.',
      matchedFaqId: null,
      suggestAddToFaq: false,
    };
  }
}
