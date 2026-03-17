/**
 * One-shot script to backfill embeddings for all archival memories.
 * Run with: npx tsx scripts/backfill-embeddings.ts
 */
import { config } from 'dotenv';
config();

import { getMemoryByTier } from '../packages/core/src/db/memory.js';
import { getEmbeddings } from '../packages/core/src/ai/embeddings.js';
import { getSupabase } from '../packages/core/src/db/client.js';

async function main(): Promise<void> {
  console.log('Backfilling embeddings for archival memories...');

  const archivalMemories = await getMemoryByTier('archival');
  const toEmbed = archivalMemories.filter((m) => !(m as Record<string, unknown>)['embedding']);

  if (toEmbed.length === 0) {
    console.log('All archival memories already have embeddings.');
    return;
  }

  console.log(`Found ${toEmbed.length} memories without embeddings.`);

  const texts = toEmbed.map((m) => `${m.category}: ${m.key} - ${m.content}`);
  const embeddings = await getEmbeddings(texts);

  if (!embeddings) {
    console.error('Embedding server unavailable. Start it first: docker compose -f docker-compose.prod.yml up embedding-server');
    process.exit(1);
  }

  const db = getSupabase();

  for (let i = 0; i < toEmbed.length; i++) {
    const memory = toEmbed[i]!;
    const embedding = embeddings[i]!;

    const { error } = await db
      .from('memory')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', memory.id);

    if (error) {
      console.error(`Failed to update ${memory.key}:`, error.message);
    } else {
      console.log(`  ✓ ${memory.category}/${memory.key}`);
    }
  }

  console.log(`Done! Embedded ${toEmbed.length} memories.`);
}

main().catch(console.error);
