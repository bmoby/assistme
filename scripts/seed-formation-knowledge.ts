/**
 * Idempotent seed script: reads markdown files from recherche/ and specs/06-formation/,
 * chunks by ## headings, and upserts into formation_knowledge with embeddings.
 *
 * Run with: pnpm seed:knowledge
 */
import { config } from 'dotenv';
config();

import * as fs from 'node:fs';
import * as path from 'node:path';
import { upsertFormationKnowledge } from '../packages/core/src/db/formation/knowledge.js';
import { getEmbeddings } from '../packages/core/src/ai/embeddings.js';
import { getSupabase } from '../packages/core/src/db/client.js';
import type { FormationKnowledgeContentType } from '../packages/core/src/types/index.js';

// ============================================
// Source file mapping
// ============================================

interface SourceMapping {
  filePath: string;
  module: number;
  sessionNumber: number | null;
  contentType: FormationKnowledgeContentType;
  defaultTags: string[];
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

const SOURCE_MAPPINGS: SourceMapping[] = [
  // Module 1 session plans
  {
    filePath: 'recherche/module-1/session-1-onboarding.md',
    module: 1,
    sessionNumber: 1,
    contentType: 'lesson_plan',
    defaultTags: ['onboarding', 'kick-off', 'discord', 'pods'],
  },
  {
    filePath: 'recherche/module-1/session-2-salle-cuisine.md',
    module: 1,
    sessionNumber: 2,
    contentType: 'lesson_plan',
    defaultTags: ['analogie', 'restaurant', 'front-end', 'back-end', 'quick-win'],
  },
  {
    filePath: 'recherche/module-1/session-3-frigo-fournisseurs.md',
    module: 1,
    sessionNumber: 3,
    contentType: 'lesson_plan',
    defaultTags: ['database', 'api', 'auth', 'dns', 'restaurant'],
  },
  {
    filePath: 'recherche/module-1/session-4-paysage-ia.md',
    module: 1,
    sessionNumber: 4,
    contentType: 'lesson_plan',
    defaultTags: ['ia', 'outils', 'cursor', 'claude', 'v0'],
  },

  // Module 1 supporting files
  {
    filePath: 'recherche/module-1/SYNTHESE.md',
    module: 1,
    sessionNumber: null,
    contentType: 'pedagogical_note',
    defaultTags: ['synthese', 'module-1', 'overview'],
  },
  {
    filePath: 'recherche/module-1/exercices-et-visuels.md',
    module: 1,
    sessionNumber: null,
    contentType: 'exercise',
    defaultTags: ['exercices', 'templates', 'feedback', 'rubric'],
  },
  {
    filePath: 'recherche/module-1/setup-etudiants.md',
    module: 1,
    sessionNumber: null,
    contentType: 'setup_guide',
    defaultTags: ['setup', 'outils', 'installation', 'budget'],
  },

  // Formateur guide
  {
    filePath: 'recherche/GUIDE-FORMATEUR.md',
    module: 1,
    sessionNumber: null,
    contentType: 'setup_guide',
    defaultTags: ['formateur', 'guide', 'discord', 'setup', 'correction', 'routine'],
  },

  // Module 1 additional files
  {
    filePath: 'recherche/module-1/SESSION-1-LIVE.md',
    module: 1,
    sessionNumber: 1,
    contentType: 'lesson_plan',
    defaultTags: ['session-1', 'live', 'kick-off', 'notes'],
  },
  {
    filePath: 'recherche/module-1/visuels-session-1.md',
    module: 1,
    sessionNumber: 1,
    contentType: 'pedagogical_note',
    defaultTags: ['visuels', 'session-1', 'slides', 'schemas'],
  },

  // Formation spec (curriculum)
  {
    filePath: 'specs/06-formation/SPEC.md',
    module: 1,
    sessionNumber: null,
    contentType: 'pedagogical_note',
    defaultTags: ['curriculum', 'spec', 'roadmap', 'vision'],
  },

  // Research documents
  {
    filePath: 'specs/06-formation/recherches/recherche-A-psychologie-apprenants.md',
    module: 1,
    sessionNumber: null,
    contentType: 'research',
    defaultTags: ['psychologie', 'apprenants', 'blocages', 'motivation'],
  },
  {
    filePath: 'specs/06-formation/recherches/recherche-B-pedagogie-tech-non-techniques.md',
    module: 1,
    sessionNumber: null,
    contentType: 'research',
    defaultTags: ['pedagogie', 'non-techniques', 'methodes'],
  },
  {
    filePath: 'specs/06-formation/recherches/recherche-C-structure-programme-3-mois.md',
    module: 1,
    sessionNumber: null,
    contentType: 'research',
    defaultTags: ['structure', 'programme', '3-mois', 'progression'],
  },
  {
    filePath: 'specs/06-formation/recherches/recherche-D-analogie-restaurant-architecture-logicielle.md',
    module: 1,
    sessionNumber: null,
    contentType: 'research',
    defaultTags: ['analogie', 'restaurant', 'architecture', 'front-end', 'back-end', 'api', 'database'],
  },
  {
    filePath: 'specs/06-formation/recherches/recherche-D-paysage-outils-IA-coding.md',
    module: 1,
    sessionNumber: null,
    contentType: 'research',
    defaultTags: ['ia', 'outils', 'cursor', 'claude', 'codex', 'v0', 'bolt'],
  },
  {
    filePath: 'specs/06-formation/recherches/recherche-E-quick-win-premier-deploiement.md',
    module: 1,
    sessionNumber: null,
    contentType: 'research',
    defaultTags: ['quick-win', 'deploiement', 'motivation', 'v0', 'vercel'],
  },
];

// ============================================
// Chunking logic
// ============================================

interface Chunk {
  title: string;
  content: string;
  tags: string[];
}

function chunkByHeadings(markdown: string, defaultTags: string[]): Chunk[] {
  const lines = markdown.split('\n');
  const chunks: Chunk[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  function flush(): void {
    if (currentTitle && currentLines.length > 0) {
      const content = currentLines.join('\n').trim();
      if (content.length > 50) {
        // Extract inline tags from content (bold words, table headers)
        const inlineTags = extractTags(content);
        chunks.push({
          title: currentTitle.replace(/^#+\s*/, '').trim(),
          content,
          tags: [...new Set([...defaultTags, ...inlineTags])],
        });
      }
    }
  }

  for (const line of lines) {
    // Split on ## headings (H2). H1 becomes the first chunk title.
    if (/^#{1,2}\s+/.test(line)) {
      flush();
      currentTitle = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  // If a single chunk is too large (>3000 chars), split on ### (H3)
  const finalChunks: Chunk[] = [];
  for (const chunk of chunks) {
    if (chunk.content.length > 3000) {
      const subChunks = splitOnH3(chunk);
      finalChunks.push(...subChunks);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

function splitOnH3(chunk: Chunk): Chunk[] {
  const lines = chunk.content.split('\n');
  const result: Chunk[] = [];
  let subTitle = chunk.title;
  let subLines: string[] = [];

  function flush(): void {
    if (subLines.length > 0) {
      const content = subLines.join('\n').trim();
      if (content.length > 50) {
        result.push({
          title: subTitle,
          content,
          tags: chunk.tags,
        });
      }
    }
  }

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      flush();
      subTitle = `${chunk.title} > ${line.replace(/^###\s*/, '').trim()}`;
      subLines = [];
    } else {
      subLines.push(line);
    }
  }
  flush();

  // If no H3 splits happened, return original
  return result.length > 0 ? result : [chunk];
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  // Extract bold terms (**term**)
  const boldMatches = content.matchAll(/\*\*([^*]+)\*\*/g);
  for (const match of boldMatches) {
    const term = match[1]!.toLowerCase().trim();
    if (term.length >= 3 && term.length <= 30 && !term.includes('\n')) {
      tags.push(term);
    }
  }
  // Limit to 10 most relevant
  return tags.slice(0, 10);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log('=== Formation Knowledge Seed ===\n');

  let totalChunks = 0;
  let totalFiles = 0;
  const allChunks: Array<{ chunk: Chunk; mapping: SourceMapping }> = [];

  for (const mapping of SOURCE_MAPPINGS) {
    const fullPath = path.join(PROJECT_ROOT, mapping.filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`  SKIP ${mapping.filePath} (file not found)`);
      continue;
    }

    const markdown = fs.readFileSync(fullPath, 'utf-8');
    const chunks = chunkByHeadings(markdown, mapping.defaultTags);

    console.log(`  ${mapping.filePath} → ${chunks.length} chunks`);
    totalFiles++;

    for (const chunk of chunks) {
      allChunks.push({ chunk, mapping });
    }
  }

  console.log(`\nTotal: ${allChunks.length} chunks from ${totalFiles} files\n`);

  // Upsert all chunks
  console.log('Upserting chunks...');
  const upsertedIds: string[] = [];

  for (const { chunk, mapping } of allChunks) {
    try {
      const entry = await upsertFormationKnowledge({
        session_number: mapping.sessionNumber,
        module: mapping.module,
        content_type: mapping.contentType,
        title: chunk.title,
        content: chunk.content,
        tags: chunk.tags,
        source_file: mapping.filePath,
      });
      upsertedIds.push(entry.id);
      totalChunks++;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n  FAIL: ${chunk.title} — ${(err as Error).message}`);
    }
  }
  console.log(`\n\nUpserted ${totalChunks} chunks.\n`);

  // Clean up orphaned entries (source_file no longer in SOURCE_MAPPINGS)
  const validSourceFiles = SOURCE_MAPPINGS.map((m) => m.filePath);
  const db = getSupabase();

  if (upsertedIds.length > 0) {
    const { data: orphans } = await db
      .from('formation_knowledge')
      .select('id, source_file')
      .not('source_file', 'in', `(${validSourceFiles.join(',')})`);

    if (orphans && orphans.length > 0) {
      const orphanIds = orphans.map((row) => (row as Record<string, string>)['id']!);
      const { error } = await db
        .from('formation_knowledge')
        .delete()
        .in('id', orphanIds);

      if (!error) {
        console.log(`Cleaned up ${orphans.length} orphaned entries.`);
      } else {
        console.error(`Failed to clean orphans: ${error.message}`);
      }
    } else {
      console.log('No orphaned entries found.');
    }
  }

  // Batch embed all entries that don't have embeddings yet
  console.log('Generating embeddings...');
  const { data: noEmbedding } = await db
    .from('formation_knowledge')
    .select('id, title, content')
    .is('embedding', null);

  if (noEmbedding && noEmbedding.length > 0) {
    const BATCH_SIZE = 32;
    let embedded = 0;

    for (let i = 0; i < noEmbedding.length; i += BATCH_SIZE) {
      const batch = noEmbedding.slice(i, i + BATCH_SIZE);
      const texts = batch.map((row) => `${(row as Record<string, string>)['title']}\n${(row as Record<string, string>)['content']}`);
      const embeddings = await getEmbeddings(texts);

      if (!embeddings) {
        console.error('\nEmbedding server unavailable. Run: docker compose -f docker-compose.prod.yml up embedding-server');
        console.log(`Chunks are saved without embeddings. Re-run this script when the server is up.`);
        break;
      }

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j] as Record<string, string>;
        const emb = embeddings[j];
        if (!emb) continue;

        const { error } = await db
          .from('formation_knowledge')
          .update({ embedding: JSON.stringify(emb) })
          .eq('id', row['id']);

        if (!error) embedded++;
      }
      process.stdout.write(`[${Math.min(i + BATCH_SIZE, noEmbedding.length)}/${noEmbedding.length}]`);
    }
    console.log(`\nEmbedded ${embedded} chunks.`);
  } else {
    console.log('All chunks already have embeddings.');
  }

  // Summary
  const { data: summary } = await db
    .from('formation_knowledge')
    .select('content_type')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const type = (row as Record<string, string>)['content_type']!;
        counts[type] = (counts[type] ?? 0) + 1;
      }
      return { data: counts };
    });

  console.log('\n=== Summary ===');
  if (summary) {
    for (const [type, count] of Object.entries(summary)) {
      console.log(`  ${type}: ${count}`);
    }
  }

  const { count: withEmbedding } = await db
    .from('formation_knowledge')
    .select('id', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { count: total } = await db
    .from('formation_knowledge')
    .select('id', { count: 'exact', head: true });

  console.log(`\n  Total entries: ${total}`);
  console.log(`  With embeddings: ${withEmbedding}`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
