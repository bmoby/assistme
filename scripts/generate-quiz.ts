#!/usr/bin/env tsx
import { config } from 'dotenv';
config({ quiet: true });

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { askClaude, type ModelChoice } from '../packages/core/src/ai/client.js';
import { padSession, validateQuizText } from './quiz-utils.js';

interface GenerateOptions {
  sessions: number[];
  deliverySession: number;
  count: number;
  output?: string;
  focus?: string;
  model: ModelChoice;
  dryRun: boolean;
}

const PROJECT_ROOT = process.cwd();
const LEARNING_DIR = join(PROJECT_ROOT, 'learning-knowledge');
const QUIZZES_DIR = join(LEARNING_DIR, 'quizzes');

function parseArgs(args: string[]): GenerateOptions {
  let sessions: number[] = [];
  let deliverySession: number | undefined;
  let count = 12;
  let output: string | undefined;
  let focus: string | undefined;
  let model: ModelChoice = 'sonnet';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    const next = args[i + 1];

    if (arg === '--') {
      continue;
    } else if (arg === '--sessions') {
      if (!next) throw new Error('--sessions requires a value, for example 7 or 5,6,7.');
      sessions = parseSessionList(next);
      i++;
    } else if (arg === '--delivery-session') {
      if (!next) throw new Error('--delivery-session requires a number.');
      deliverySession = parsePositiveInt(next, '--delivery-session');
      i++;
    } else if (arg === '--count') {
      if (!next) throw new Error('--count requires a number.');
      count = parsePositiveInt(next, '--count');
      i++;
    } else if (arg === '--output') {
      if (!next) throw new Error('--output requires a path.');
      output = next;
      i++;
    } else if (arg === '--focus') {
      if (!next) throw new Error('--focus requires text.');
      focus = next;
      i++;
    } else if (arg === '--model') {
      if (next !== 'sonnet' && next !== 'opus') throw new Error('--model must be sonnet or opus.');
      model = next;
      i++;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (sessions.length === 0) {
    throw new Error('Missing --sessions. Example: pnpm quiz:generate -- --sessions 7 --count 12');
  }

  if (count < 10 || count > 15) {
    throw new Error('--count must be between 10 and 15 for standard QCM quizzes.');
  }

  return {
    sessions,
    deliverySession: deliverySession ?? sessions[sessions.length - 1]!,
    count,
    output,
    focus,
    model,
    dryRun,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const sources = loadSources(options.sessions);
  const outputPath = options.output ? join(PROJECT_ROOT, options.output) : nextOutputPath(options);
  const prompt = buildPrompt(options, sources, outputPath);

  if (options.dryRun) {
    console.log(prompt);
    return;
  }

  const raw = await askClaude({
    prompt,
    systemPrompt: [
      'Tu es un concepteur pedagogique pour une formation de non-techniciens.',
      'Tu generes uniquement des fichiers TXT de quiz compatibles avec le bot Discord.',
      'Tu respectes strictement la source fournie et tu n inventes pas de notions futures.',
    ].join('\n'),
    model: options.model,
    maxTokens: 8192,
    formation: true,
  });

  const quizText = cleanModelOutput(raw);
  const validation = validateQuizText(quizText, {
    kind: 'qcm',
    expectedSession: options.deliverySession,
    minQuestions: options.count,
    maxQuestions: options.count,
    requireExplanations: true,
  });

  if (validation.errors.length > 0) {
    console.error('Generated quiz failed validation:');
    for (const error of validation.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  if (existsSync(outputPath)) {
    throw new Error(`Refusing to overwrite existing file: ${outputPath}`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${quizText.trim()}\n`, 'utf-8');

  console.log(`Created ${outputPath}`);
  console.log(`SESSION ${validation.sessionNumber} | ${validation.questionCount} questions`);

  for (const warning of validation.warnings) {
    console.log(`WARN ${warning}`);
  }
}

function parseSessionList(raw: string): number[] {
  const sessions = raw.split(',').map((part) => parsePositiveInt(part.trim(), '--sessions'));
  return Array.from(new Set(sessions)).sort((a, b) => a - b);
}

function parsePositiveInt(raw: string, label: string): number {
  if (!/^\d+$/.test(raw)) throw new Error(`${label} must be a positive integer.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
  return value;
}

function loadSources(sessions: number[]): string {
  const programme = readRequiredFile(join(LEARNING_DIR, 'programme.md'));
  const template = readRequiredFile(join(LEARNING_DIR, 'quiz-format-template.txt'));
  const rules = readRequiredFile(join(QUIZZES_DIR, 'QUIZ_RULES.md'));
  const sessionSources = sessions.map((sessionNumber) => {
    const filePath = findSessionFile(sessionNumber);
    return [
      `===== SOURCE SESSION ${sessionNumber} (${basename(filePath)}) =====`,
      readRequiredFile(filePath),
    ].join('\n\n');
  });

  return [
    '===== PROGRAMME =====',
    programme,
    '===== QUIZ FORMAT TEMPLATE =====',
    template,
    '===== QUIZ RULES =====',
    rules,
    ...sessionSources,
  ].join('\n\n');
}

function findSessionFile(sessionNumber: number): string {
  for (const moduleDir of readdirSync(LEARNING_DIR, { withFileTypes: true })) {
    if (!moduleDir.isDirectory() || !moduleDir.name.startsWith('module-')) continue;
    const dir = join(LEARNING_DIR, moduleDir.name);
    const candidates = readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .filter((file) => file.startsWith(`session-${padSession(sessionNumber)}`) || file.startsWith(`session-${sessionNumber}`))
      .filter((file) => !file.includes('homework') && !file.includes('brief'));

    if (candidates.length > 0) {
      return join(dir, candidates.sort()[0]!);
    }
  }

  throw new Error(`Could not find source markdown for session ${sessionNumber}.`);
}

function readRequiredFile(filePath: string): string {
  if (!existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`);
  return readFileSync(filePath, 'utf-8');
}

function nextOutputPath(options: GenerateOptions): string {
  const folder = join(QUIZZES_DIR, `session-${padSession(options.deliverySession)}`);
  const prefix = options.sessions.length === 1
    ? 'qcm'
    : `revision-${options.sessions.map((session) => `s${padSession(session)}`).join('-')}-qcm`;

  for (let index = 1; index <= 99; index++) {
    const filePath = join(folder, `${prefix}-${padSession(index)}.txt`);
    if (!existsSync(filePath)) return filePath;
  }

  throw new Error(`No available filename left under ${folder}.`);
}

function buildPrompt(options: GenerateOptions, sources: string, outputPath: string): string {
  const sourceSessions = options.sessions.map((session) => `S${session}`).join(', ');
  const focusLine = options.focus ? `Focus demande: ${options.focus}` : 'Focus demande: aucun focus supplementaire.';

  return [
    `Genere un quiz QCM en russe pour la session de livraison Discord ${options.deliverySession}.`,
    `Sources autorisees: ${sourceSessions}.`,
    `Nombre exact de questions: ${options.count}.`,
    focusLine,
    `Chemin cible dans le repo: ${outputPath}.`,
    '',
    'Contraintes obligatoires:',
    '- Retourne uniquement le contenu TXT final, sans bloc Markdown et sans commentaire.',
    '- Utilise uniquement des questions [QCM].',
    '- Chaque question a exactement A, B, C, D.',
    '- ANSWER contient une seule lettre.',
    '- Chaque question a une EXPLANATION pedagogique.',
    '- Les distracteurs doivent etre plausibles et tester de vraies confusions.',
    '- Les questions doivent tester la comprehension, pas la memorisation brute.',
    '- Ne teste pas de notion non couverte par les sources autorisees.',
    '- Le header SESSION doit etre exactement le numero de livraison Discord.',
    '',
    sources,
  ].join('\n');
}

function cleanModelOutput(raw: string): string {
  return raw
    .replace(/^```(?:txt|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
