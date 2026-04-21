import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

export type QuizKind = 'qcm' | 'mixed';
export type QuizQuestionType = 'QCM' | 'VF' | 'OPEN';

export interface ParsedQuizBlock {
  type: QuizQuestionType;
  number: number;
  questionText: string;
  answer: string;
  explanation: string | null;
  choices: Record<string, string> | null;
}

export interface QuizValidationOptions {
  kind?: QuizKind;
  expectedSession?: number;
  minQuestions?: number;
  maxQuestions?: number;
  requireExplanations?: boolean;
}

export interface QuizValidationResult {
  sessionNumber: number | null;
  title: string | null;
  questionCount: number;
  typeCounts: Record<QuizQuestionType, number>;
  errors: string[];
  warnings: string[];
  questions: ParsedQuizBlock[];
}

const TYPE_ORDER: QuizQuestionType[] = ['QCM', 'VF', 'OPEN'];

export function padSession(sessionNumber: number): string {
  return String(sessionNumber).padStart(2, '0');
}

export function collectTxtFiles(pathArg: string): string[] {
  const stats = statSync(pathArg);
  if (stats.isFile()) {
    return pathArg.endsWith('.txt') ? [pathArg] : [];
  }

  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        files.push(fullPath);
      }
    }
  }

  walk(pathArg);
  return files.sort();
}

export function inferQuizKind(filePath: string): QuizKind {
  const file = basename(filePath).toLowerCase();
  if (file.startsWith('qcm-') || file.includes('-qcm-')) return 'qcm';
  return 'mixed';
}

export function validateQuizFile(filePath: string, options: QuizValidationOptions = {}): QuizValidationResult {
  const text = readFileSync(filePath, 'utf-8');
  const kind = options.kind ?? inferQuizKind(filePath);
  return validateQuizText(text, {
    kind,
    minQuestions: kind === 'qcm' ? 10 : undefined,
    maxQuestions: kind === 'qcm' ? 15 : undefined,
    requireExplanations: kind === 'qcm',
    ...options,
  });
}

export function validateQuizText(text: string, options: QuizValidationOptions = {}): QuizValidationResult {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const errors: string[] = [];
  const warnings: string[] = [];
  const typeCounts: Record<QuizQuestionType, number> = { QCM: 0, VF: 0, OPEN: 0 };

  const sessionMatch = normalized.match(/^SESSION:\s*(\d+)\s*$/m);
  const titleMatch = normalized.match(/^TITLE:\s*(.+?)\s*$/m);
  const sessionNumber = sessionMatch ? Number(sessionMatch[1]) : null;
  const title = titleMatch ? titleMatch[1]!.trim() : null;

  if (!sessionNumber) errors.push('Missing or invalid SESSION header.');
  if (!title) errors.push('Missing or empty TITLE header.');
  if (options.expectedSession !== undefined && sessionNumber !== options.expectedSession) {
    errors.push(`SESSION must be ${options.expectedSession}, received ${sessionNumber ?? 'none'}.`);
  }

  const questions = parseQuestionBlocks(normalized, errors, warnings);
  const typeTagCount = normalized.match(/^\[(QCM|VF|OPEN)\]\s*$/gm)?.length ?? 0;

  if (typeTagCount !== questions.length) {
    errors.push(
      `Found ${typeTagCount} question type tags but parsed ${questions.length} questions. Check missing separators or malformed blocks.`,
    );
  }

  for (const question of questions) {
    typeCounts[question.type]++;
  }

  if (questions.length === 0) {
    errors.push('No questions found.');
  }

  validateQuestionNumbers(questions, errors);

  if (options.kind === 'qcm') {
    for (const question of questions) {
      if (question.type !== 'QCM') {
        errors.push(`Q${question.number}: qcm quiz files must contain only [QCM] questions.`);
      }
    }
  }

  if (options.minQuestions !== undefined && questions.length < options.minQuestions) {
    errors.push(`Expected at least ${options.minQuestions} questions, received ${questions.length}.`);
  }

  if (options.maxQuestions !== undefined && questions.length > options.maxQuestions) {
    errors.push(`Expected at most ${options.maxQuestions} questions, received ${questions.length}.`);
  }

  if (options.requireExplanations) {
    for (const question of questions) {
      if (!question.explanation) {
        errors.push(`Q${question.number}: missing EXPLANATION.`);
      }
    }
  }

  for (const question of questions) {
    addPedagogicalWarnings(question, warnings);
  }

  return {
    sessionNumber,
    title,
    questionCount: questions.length,
    typeCounts,
    errors,
    warnings,
    questions,
  };
}

export function formatTypeCounts(typeCounts: Record<QuizQuestionType, number>): string {
  return TYPE_ORDER.map((type) => `${type}:${typeCounts[type]}`).join(' ');
}

function parseQuestionBlocks(text: string, errors: string[], warnings: string[]): ParsedQuizBlock[] {
  const blocks = text.split(/^\s*---\s*$/m);
  const questions: ParsedQuizBlock[] = [];

  for (const block of blocks) {
    const typeMatch = block.match(/^\[(QCM|VF|OPEN)\]\s*$/m);
    if (!typeMatch) continue;

    const type = typeMatch[1] as QuizQuestionType;
    const numberMatch = block.match(/^Q(\d+)\.\s*(.+?)\s*$/m);
    if (!numberMatch) {
      errors.push(`A [${type}] block is missing a QN. question line.`);
      continue;
    }

    const number = Number(numberMatch[1]);
    const questionText = numberMatch[2]!.trim();
    const answerMatch = block.match(/^ANSWER:\s*(.+?)\s*$/m);
    const explanationMatch = block.match(/^EXPLANATION:\s*(.+?)\s*$/m);

    if (!answerMatch) {
      errors.push(`Q${number}: missing ANSWER.`);
      continue;
    }

    const answer = answerMatch[1]!.trim();
    const explanation = explanationMatch ? explanationMatch[1]!.trim() : null;
    const choices = type === 'QCM' ? parseChoices(block) : null;

    if (type === 'QCM') {
      validateChoiceLabels(number, block, errors);
      validateQcm(number, choices, answer, errors, warnings);
    } else if (type === 'VF') {
      validateTrueFalse(number, answer, errors);
    }

    questions.push({
      type,
      number,
      questionText,
      answer,
      explanation,
      choices,
    });
  }

  return questions.sort((a, b) => a.number - b.number);
}

function parseChoices(block: string): Record<string, string> {
  const choices: Record<string, string> = {};
  const choiceRegex = /^\s*([A-D])\)\s*(.+?)\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = choiceRegex.exec(block)) !== null) {
    choices[match[1]!] = match[2]!.trim();
  }

  return choices;
}

function validateChoiceLabels(number: number, block: string, errors: string[]): void {
  const invalidChoiceMatch = block.match(/^\s*([E-Z])\)\s*.+$/m);
  if (invalidChoiceMatch) {
    errors.push(`Q${number}: unexpected choice ${invalidChoiceMatch[1]}. Only A, B, C and D are allowed.`);
  }
}

function validateQcm(
  number: number,
  choices: Record<string, string> | null,
  answer: string,
  errors: string[],
  warnings: string[],
): void {
  const keys = Object.keys(choices ?? {});
  const required = ['A', 'B', 'C', 'D'];

  for (const key of required) {
    if (!choices?.[key]) errors.push(`Q${number}: missing choice ${key}.`);
  }

  if (!/^[A-D]$/.test(answer)) {
    errors.push(`Q${number}: QCM ANSWER must be A, B, C or D.`);
  }

  if (new Set(keys).size !== keys.length) {
    errors.push(`Q${number}: duplicate choice keys.`);
  }

  const values = Object.values(choices ?? {}).map((value) => value.toLowerCase());
  if (new Set(values).size !== values.length) {
    warnings.push(`Q${number}: duplicate or near-duplicate choice text.`);
  }
}

function validateTrueFalse(number: number, answer: string, errors: string[]): void {
  if (answer !== 'true' && answer !== 'false') {
    errors.push(`Q${number}: VF ANSWER must be true or false.`);
  }
}

function validateQuestionNumbers(questions: ParsedQuizBlock[], errors: string[]): void {
  const seen = new Set<number>();

  for (const question of questions) {
    if (seen.has(question.number)) {
      errors.push(`Q${question.number}: duplicate question number.`);
    }
    seen.add(question.number);
  }

  for (let i = 0; i < questions.length; i++) {
    const expected = i + 1;
    const received = questions[i]?.number;
    if (received !== expected) {
      errors.push(`Question numbering must be sequential: expected Q${expected}, received Q${received ?? 'none'}.`);
      return;
    }
  }
}

function addPedagogicalWarnings(question: ParsedQuizBlock, warnings: string[]): void {
  if (question.questionText.length < 30) {
    warnings.push(`Q${question.number}: question is very short; prefer a concrete learning check.`);
  }

  if (question.explanation && question.explanation.length < 35) {
    warnings.push(`Q${question.number}: explanation is short; it may not teach enough after a wrong answer.`);
  }

  if (question.type === 'QCM' && question.choices) {
    for (const [key, value] of Object.entries(question.choices)) {
      if (value.length < 10) {
        warnings.push(`Q${question.number}: choice ${key} is very short; check that distractors are plausible.`);
      }
    }
  }
}
