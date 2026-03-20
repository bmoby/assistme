/**
 * Auto-discovery seed script: scans learning-knowledge/ recursively,
 * chunks markdown files by ## headings, and upserts into formation_knowledge
 * with OpenAI embeddings.
 *
 * - Adds new/changed files automatically
 * - Removes chunks from deleted files (orphan cleanup)
 * - No hardcoded file mappings — just drop .md files and run
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

const PROJECT_ROOT = process.cwd();
const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'learning-knowledge');

// ============================================
// Auto-discovery: scan directory for .md files
// ============================================

interface DiscoveredFile {
  filePath: string;       // relative to PROJECT_ROOT (e.g. "learning-knowledge/module-1/session-1-onboarding.md")
  module: number;
  sessionNumber: number | null;
  contentType: FormationKnowledgeContentType;
  defaultTags: string[];
}

function discoverFiles(): DiscoveredFile[] {
  const files: DiscoveredFile[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(PROJECT_ROOT, fullPath);
        const parsed = parseFile(relativePath, entry.name);
        if (parsed) files.push(parsed);
      }
    }
  }

  walk(KNOWLEDGE_DIR);
  return files;
}

function parseFile(relativePath: string, filename: string): DiscoveredFile | null {
  const lower = filename.toLowerCase();
  const dirParts = relativePath.split(path.sep);

  // Detect module from directory name: "module-1", "module-2", etc.
  let module = 1; // default
  for (const part of dirParts) {
    const moduleMatch = part.match(/^module-(\d+)$/);
    if (moduleMatch) {
      module = parseInt(moduleMatch[1]!, 10);
      break;
    }
  }

  // Detect session number from filename: "session-3-xxx.md"
  let sessionNumber: number | null = null;
  const sessionMatch = lower.match(/session-(\d+)/);
  if (sessionMatch) {
    sessionNumber = parseInt(sessionMatch[1]!, 10);
  }

  // Detect content type from filename/directory
  let contentType: FormationKnowledgeContentType = 'pedagogical_note';
  if (lower.includes('session-') && (lower.includes('live') || !lower.includes('recherche'))) {
    contentType = 'lesson_plan';
  } else if (lower.includes('exercice') || lower.includes('exercise')) {
    contentType = 'exercise';
  } else if (lower.includes('setup') || lower.includes('guide')) {
    contentType = 'setup_guide';
  } else if (dirParts.includes('recherches') || lower.includes('recherche-')) {
    contentType = 'research';
  } else if (lower.includes('curriculum')) {
    contentType = 'pedagogical_note';
  }

  // Build default tags from filename
  const defaultTags = filename
    .replace(/\.md$/i, '')
    .split(/[-_]/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t))
    .map((t) => t.toLowerCase());

  return {
    filePath: relativePath,
    module,
    sessionNumber,
    contentType,
    defaultTags,
  };
}

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
    if (/^#{1,2}\s+/.test(line)) {
      flush();
      currentTitle = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  // Split large chunks on ### (H3)
  const finalChunks: Chunk[] = [];
  for (const chunk of chunks) {
    if (chunk.content.length > 3000) {
      finalChunks.push(...splitOnH3(chunk));
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
        result.push({ title: subTitle, content, tags: chunk.tags });
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

  return result.length > 0 ? result : [chunk];
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  const boldMatches = content.matchAll(/\*\*([^*]+)\*\*/g);
  for (const match of boldMatches) {
    const term = match[1]!.toLowerCase().trim();
    if (term.length >= 3 && term.length <= 30 && !term.includes('\n')) {
      tags.push(term);
    }
  }
  return tags.slice(0, 10);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log('=== Formation Knowledge Seed (auto-discovery) ===\n');

  // 1. Discover all .md files
  const discovered = discoverFiles();
  console.log(`Found ${discovered.length} markdown files in learning-knowledge/\n`);

  // 2. Chunk and collect
  const allChunks: Array<{ chunk: Chunk; file: DiscoveredFile }> = [];
  let totalFiles = 0;

  for (const file of discovered) {
    const fullPath = path.join(PROJECT_ROOT, file.filePath);
    const markdown = fs.readFileSync(fullPath, 'utf-8');
    const chunks = chunkByHeadings(markdown, file.defaultTags);

    console.log(`  ${file.filePath} → ${chunks.length} chunks [${file.contentType}, M${file.module}${file.sessionNumber ? ` S${file.sessionNumber}` : ''}]`);
    totalFiles++;

    for (const chunk of chunks) {
      allChunks.push({ chunk, file });
    }
  }

  console.log(`\nTotal: ${allChunks.length} chunks from ${totalFiles} files\n`);

  // 3. Upsert all chunks
  console.log('Upserting chunks...');
  const seenSourceFiles = new Set<string>();

  for (const { chunk, file } of allChunks) {
    seenSourceFiles.add(file.filePath);
    try {
      await upsertFormationKnowledge({
        session_number: file.sessionNumber,
        module: file.module,
        content_type: file.contentType,
        title: chunk.title,
        content: chunk.content,
        tags: chunk.tags,
        source_file: file.filePath,
      });
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n  FAIL: ${chunk.title} — ${(err as Error).message}`);
    }
  }
  console.log(`\n\nUpserted ${allChunks.length} chunks.\n`);

  // 4. Clean up orphans (files removed from learning-knowledge/)
  const db = getSupabase();
  const { data: allEntries } = await db
    .from('formation_knowledge')
    .select('id, source_file');

  if (allEntries) {
    const orphanIds = allEntries
      .filter((row) => !seenSourceFiles.has((row as Record<string, string>)['source_file']!))
      .map((row) => (row as Record<string, string>)['id']!);

    if (orphanIds.length > 0) {
      const { error } = await db
        .from('formation_knowledge')
        .delete()
        .in('id', orphanIds);

      if (!error) {
        console.log(`Cleaned up ${orphanIds.length} orphaned entries.`);
      } else {
        console.error(`Failed to clean orphans: ${error.message}`);
      }
    } else {
      console.log('No orphaned entries found.');
    }
  }

  // 5. Embed chunks without embeddings
  console.log('\nGenerating embeddings...');
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
        console.error('\nOpenAI API unavailable. Check OPENAI_API_KEY.');
        console.log('Chunks saved without embeddings. Re-run when API is available.');
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

  // 6. Summary
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
