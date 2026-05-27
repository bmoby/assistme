#!/usr/bin/env tsx
import { collectTxtFiles, formatTypeCounts, validateQuizFile, type QuizKind } from './quiz-utils.js';

interface CheckOptions {
  paths: string[];
  kind?: QuizKind;
}

function parseArgs(args: string[]): CheckOptions {
  const paths: string[] = [];
  let kind: QuizKind | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--') {
      continue;
    } else if (arg === '--qcm-only') {
      kind = 'qcm';
    } else if (arg === '--mixed') {
      kind = 'mixed';
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      paths.push(arg);
    }
  }

  return {
    paths: paths.length > 0 ? paths : ['learning-knowledge/quizzes'],
    kind,
  };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const files = options.paths.flatMap((pathArg) => collectTxtFiles(pathArg));

  if (files.length === 0) {
    throw new Error('No .txt quiz files found.');
  }

  let hasErrors = false;

  for (const file of files) {
    const result = validateQuizFile(file, { kind: options.kind });
    const status = result.errors.length === 0 ? 'OK' : 'FAIL';
    console.log(`${status} ${file}`);
    console.log(`  SESSION: ${result.sessionNumber ?? 'missing'} | questions: ${result.questionCount} | ${formatTypeCounts(result.typeCounts)}`);

    for (const warning of result.warnings) {
      console.log(`  WARN ${warning}`);
    }

    for (const error of result.errors) {
      console.log(`  ERROR ${error}`);
    }

    if (result.errors.length > 0) hasErrors = true;
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
