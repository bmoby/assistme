import Anthropic from '@anthropic-ai/sdk';
import { getKnowledgeBySession } from '../../db/formation/knowledge.js';
import { logger } from '../../logger.js';
import type { AttachmentType } from '../../types/index.js';

export interface ExerciseReviewResult {
  score: number;
  strengths: string[];
  improvements: string[];
  recommendation: 'approve' | 'revision_needed';
  summary: string;
  detailedReview: string;
}

export interface ReviewAttachment {
  signedUrl: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
}

const EXERCISE_REVIEWER_PROMPT = `Tu es un evaluateur bienveillant mais exigeant pour la formation "Pilote Neuro".
Cette formation enseigne a des non-techniques comment concevoir des systemes digitaux en pilotant l'IA.

Les etudiants ne codent PAS — ils specifient, architecturent, et pilotent l'IA pour construire.

EXERCICE :
Module {module}, Exercice {exercise_number}
Description : {exercise_description}

SOUMISSION DE L'ETUDIANT :
{student_name}
Type : {submission_type}

TA MISSION :
Evalue cette soumission selon ces criteres :
1. Comprehension des concepts (le brief montre une vraie comprehension ?)
2. Qualite de la specification/architecture (structure logique, completude)
3. Utilisation appropriee de l'IA (bons prompts, bonne methode)
4. Creativite et pertinence du projet
5. Respect des consignes de l'exercice

CONTENU PEDAGOGIQUE DE LA SESSION (ce qui a ete enseigne) :
{session_knowledge}

IMPORTANT : Tu evalues un PILOTE, pas un developpeur. La qualite du code n'est PAS un critere.
Utilise le contenu pedagogique ci-dessus pour comprendre ce qui a ete enseigne et evaluer si l'etudiant a bien compris.

Reponds en JSON strict.
Les champs "summary", "strengths" et "improvements" DOIVENT etre en RUSSE (destines a l'etudiant).
Le champ "detailedReview" est en FRANCAIS (destine au formateur).
{
  "score": <1-10>,
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["улучшение 1", "улучшение 2"],
  "recommendation": "approve" ou "revision_needed",
  "summary": "Краткое резюме для студента (2-3 предложения, доброжелательно, НА РУССКОМ)",
  "detailedReview": "Analyse detaillee pour le formateur (5-10 phrases, EN FRANCAIS)"
}`;

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env['ANTHROPIC_API_KEY_FORMATION'] ?? process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY_FORMATION or ANTHROPIC_API_KEY');
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
type ImageMediaType = (typeof IMAGE_MIME_TYPES)[number];

function isImageMimeType(mime: string): mime is ImageMediaType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export async function reviewExercise(params: {
  module: number;
  exerciseNumber: number;
  exerciseDescription?: string;
  studentName: string;
  sessionNumber?: number;
  attachments?: ReviewAttachment[];
  submissionUrl?: string;
  submissionType?: string;
}): Promise<ExerciseReviewResult> {
  logger.info(
    { module: params.module, exercise: params.exerciseNumber, student: params.studentName, attachmentCount: params.attachments?.length ?? 0 },
    'Starting exercise review'
  );

  // Load pedagogical context for the session
  let sessionKnowledge = 'Non disponible.';
  if (params.sessionNumber) {
    try {
      const knowledge = await getKnowledgeBySession(params.sessionNumber);
      if (knowledge.length > 0) {
        const priority: Record<string, number> = { exercise: 0, lesson_plan: 1, concept: 2, pedagogical_note: 3, research: 4, setup_guide: 5 };
        sessionKnowledge = knowledge
          .sort((a, b) => (priority[a.content_type] ?? 99) - (priority[b.content_type] ?? 99))
          .map((k) => `[${k.content_type}] ${k.title}\n${k.content}`)
          .join('\n\n---\n\n')
          .slice(0, 8000);
      }
    } catch (err) {
      logger.debug({ err }, 'Failed to load session knowledge for exercise review (non-critical)');
    }
  }

  const submissionType = params.submissionType
    ?? params.attachments?.map((a) => a.type).join('+')
    ?? 'link';

  const systemPrompt = EXERCISE_REVIEWER_PROMPT
    .replace('{module}', String(params.module))
    .replace('{exercise_number}', String(params.exerciseNumber))
    .replace('{exercise_description}', params.exerciseDescription ?? 'Non specifie')
    .replace('{student_name}', params.studentName)
    .replace('{submission_type}', submissionType)
    .replace('{session_knowledge}', sessionKnowledge);

  // Build multimodal content blocks
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [
    { type: 'text', text: 'Evalue cet exercice soumis par un etudiant. Reponds uniquement en JSON.' },
  ];

  const attachments = params.attachments ?? [];

  // Add non-image attachments info as text
  const nonImageAttachments = attachments.filter((a) => !isImageMimeType(a.mimeType));
  if (nonImageAttachments.length > 0) {
    const lines = nonImageAttachments.map((a) =>
      `Fichier: ${a.filename} (${a.type}) — URL temporaire: ${a.signedUrl}`
    );
    contentBlocks.push({
      type: 'text',
      text: `\nFichiers joints (non-image):\n${lines.join('\n')}`,
    });
  }

  // Legacy submissionUrl support
  if (params.submissionUrl && attachments.length === 0) {
    contentBlocks.push({
      type: 'text',
      text: `\nURL de soumission: ${params.submissionUrl}`,
    });
  }

  // Add images as multimodal blocks
  const imageAttachments = attachments.filter((a) => isImageMimeType(a.mimeType));
  for (const img of imageAttachments) {
    contentBlocks.push({
      type: 'text',
      text: `\nImage: ${img.filename}`,
    });
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'url',
        url: img.signedUrl,
      },
    });
  }

  const client = getClient();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: contentBlocks }],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  const response = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned) as ExerciseReviewResult;

    logger.info(
      { module: params.module, exercise: params.exerciseNumber, score: result.score, recommendation: result.recommendation },
      'Exercise review completed'
    );

    return result;
  } catch (parseError) {
    logger.warn({ parseError, response: response.slice(0, 200) }, 'Failed to parse exercise review JSON, using fallback');

    return {
      score: 5,
      strengths: ['\u0417\u0430\u0434\u0430\u043d\u0438\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e \u0432\u043e\u0432\u0440\u0435\u043c\u044f'],
      improvements: ['\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u2014 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0440\u0443\u0447\u043d\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430'],
      recommendation: 'revision_needed',
      summary: '\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043d\u0435 \u0441\u043c\u043e\u0433\u043b\u0430 \u043f\u0440\u043e\u0430\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u0432\u043e\u044e \u0440\u0430\u0431\u043e\u0442\u0443. \u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442 \u0432\u0440\u0443\u0447\u043d\u0443\u044e.',
      detailedReview: `Review automatique echouee. Reponse brute de l'IA :\n${response.slice(0, 500)}`,
    };
  }
}
