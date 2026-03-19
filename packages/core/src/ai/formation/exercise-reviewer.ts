import { askClaude } from '../client.js';
import { getKnowledgeBySession } from '../../db/formation/knowledge.js';
import { logger } from '../../logger.js';

export interface ExerciseReviewResult {
  score: number;
  strengths: string[];
  improvements: string[];
  recommendation: 'approve' | 'revision_needed';
  summary: string;
  detailedReview: string;
}

const EXERCISE_REVIEWER_PROMPT = `Tu es un evaluateur bienveillant mais exigeant pour la formation "Pilote Neuro".
Cette formation enseigne a des non-techniques comment concevoir des systemes digitaux en pilotant l'IA.

Les etudiants ne codent PAS — ils specifient, architecturent, et pilotent l'IA pour construire.

EXERCICE :
Module {module}, Exercice {exercise_number}
Description : {exercise_description}

SOUMISSION DE L'ETUDIANT :
{student_name}
URL : {submission_url}
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

Reponds en JSON strict :
{
  "score": <1-10>,
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["amelioration 1", "amelioration 2"],
  "recommendation": "approve" ou "revision_needed",
  "summary": "Resume court pour l'etudiant (2-3 phrases, bienveillant)",
  "detailedReview": "Analyse detaillee pour le formateur (5-10 phrases)"
}`;

export async function reviewExercise(params: {
  submissionUrl: string;
  submissionType?: string;
  module: number;
  exerciseNumber: number;
  exerciseDescription?: string;
  studentName: string;
  sessionNumber?: number;
}): Promise<ExerciseReviewResult> {
  logger.info(
    { module: params.module, exercise: params.exerciseNumber, student: params.studentName },
    'Starting exercise review'
  );

  // Load pedagogical context for the session
  let sessionKnowledge = 'Non disponible.';
  if (params.sessionNumber) {
    try {
      const knowledge = await getKnowledgeBySession(params.sessionNumber);
      if (knowledge.length > 0) {
        sessionKnowledge = knowledge
          .map((k) => `[${k.content_type}] ${k.title}\n${k.content}`)
          .join('\n\n---\n\n')
          // Limit to ~4000 chars to avoid token overflow
          .slice(0, 4000);
      }
    } catch (err) {
      logger.debug({ err }, 'Failed to load session knowledge for exercise review (non-critical)');
    }
  }

  const prompt = EXERCISE_REVIEWER_PROMPT
    .replace('{module}', String(params.module))
    .replace('{exercise_number}', String(params.exerciseNumber))
    .replace('{exercise_description}', params.exerciseDescription ?? 'Non specifie')
    .replace('{student_name}', params.studentName)
    .replace('{submission_url}', params.submissionUrl)
    .replace('{submission_type}', params.submissionType ?? 'link')
    .replace('{session_knowledge}', sessionKnowledge);

  const response = await askClaude({
    prompt: 'Evalue cet exercice soumis par un etudiant. Reponds uniquement en JSON.',
    systemPrompt: prompt,
    model: 'sonnet',
    maxTokens: 4096,
  });

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
      strengths: ['Exercice soumis dans les temps'],
      improvements: ['Review automatique indisponible — review manuelle necessaire'],
      recommendation: 'revision_needed',
      summary: 'La review automatique n\'a pas pu analyser ta soumission. Le formateur va regarder manuellement.',
      detailedReview: `Review automatique echouee. Reponse brute de l'IA :\n${response.slice(0, 500)}`,
    };
  }
}
