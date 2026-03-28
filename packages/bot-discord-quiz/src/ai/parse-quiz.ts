import { z } from 'zod';
import { askClaude, logger } from '@assistme/core';

const QUIZ_PARSE_SYSTEM_PROMPT = `Tu es un parseur de quiz pedagogiques. Analyse le texte fourni et retourne UNIQUEMENT un objet JSON valide, sans aucun texte avant ou apres. Format attendu:
{
  "title": "string - titre du quiz ou 'Quiz Session N'",
  "questions": [
    {
      "question_number": 1,
      "type": "mcq" | "true_false" | "open",
      "question_text": "string - texte complet de la question",
      "choices": { "A": "...", "B": "...", "C": "...", "D": "..." } | null,
      "correct_answer": "string - lettre pour mcq, 'true'/'false' pour true_false, texte pour open",
      "explanation": "string | null - explication de la reponse si presente dans le texte"
    }
  ]
}
Regles:
- type "mcq" si la question propose des options labellisees (A/B/C/D, a/b/c/d, 1/2/3/4, etc.)
- type "true_false" si question binaire (vrai/faux, true/false, oui/non, da/net, верно/неверно, правда/ложь)
- type "open" si aucune option fournie, ou question de type matching/classement/reponse libre
- correct_answer pour mcq: la lettre de la bonne reponse (A, B, C, D)
- correct_answer pour true_false: "true" ou "false"
- correct_answer pour open: la reponse modele complete depuis le corrige
- choices est null pour true_false et open
- Ne jamais inventer de questions absentes du texte
- Numerote les questions dans l'ordre d'apparition (1, 2, 3...)`;

const McqQuestionSchema = z.object({
  question_number: z.number().int().positive(),
  type: z.literal('mcq'),
  question_text: z.string().min(1),
  choices: z.record(z.string()),
  correct_answer: z.string().min(1),
  explanation: z.string().nullable(),
});

const TrueFalseQuestionSchema = z.object({
  question_number: z.number().int().positive(),
  type: z.literal('true_false'),
  question_text: z.string().min(1),
  choices: z.null(),
  correct_answer: z.enum(['true', 'false']),
  explanation: z.string().nullable(),
});

const OpenQuestionSchema = z.object({
  question_number: z.number().int().positive(),
  type: z.literal('open'),
  question_text: z.string().min(1),
  choices: z.null(),
  correct_answer: z.string().min(1),
  explanation: z.string().nullable(),
});

const ParsedQuizQuestionSchema = z.discriminatedUnion('type', [
  McqQuestionSchema,
  TrueFalseQuestionSchema,
  OpenQuestionSchema,
]);

export const ParsedQuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(ParsedQuizQuestionSchema).min(1),
});

export type ParsedQuizQuestion = z.infer<typeof ParsedQuizQuestionSchema>;
export type ParsedQuiz = z.infer<typeof ParsedQuizSchema>;

/** Cross-validate MCQ correct_answer against choices keys */
function validateMcqAnswers(quiz: ParsedQuiz): void {
  for (const q of quiz.questions) {
    if (q.type === 'mcq') {
      if (Object.keys(q.choices).length < 2) {
        throw new Error(`Question ${q.question_number}: MCQ must have at least 2 choices`);
      }
      if (!Object.hasOwn(q.choices, q.correct_answer)) {
        throw new Error(`Question ${q.question_number}: correct_answer "${q.correct_answer}" not found in choices keys: ${Object.keys(q.choices).join(', ')}`);
      }
    }
  }
}

export async function parseQuizFromTxt(txtContent: string, sessionNumber: number): Promise<ParsedQuiz> {
  const raw = await askClaude({
    prompt: txtContent,
    systemPrompt: QUIZ_PARSE_SYSTEM_PROMPT,
    model: 'sonnet',
    maxTokens: 8192,
  });

  // Extract JSON even if Claude adds preamble text
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    logger.error({ rawLength: raw.length, rawPreview: raw.substring(0, 200) }, 'Claude returned no JSON block for quiz parsing');
    throw new Error('Impossible de parser le fichier. Claude n\'a pas retourne de JSON valide.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch (jsonError) {
    logger.error({ error: jsonError, rawPreview: match[0].substring(0, 200) }, 'JSON.parse failed on Claude quiz output');
    throw new Error('Impossible de parser le fichier. Le JSON retourne par Claude est malformed.');
  }

  const result = ParsedQuizSchema.parse(parsed); // throws ZodError if malformed
  validateMcqAnswers(result); // throws if MCQ correct_answer not in choices

  // Default title if generic
  if (!result.title || result.title === 'Quiz') {
    result.title = `Quiz Session ${sessionNumber}`;
  }

  logger.info({ sessionNumber, questionCount: result.questions.length, title: result.title }, 'Quiz TXT parsed successfully');
  return result;
}
