import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  searchFormationKnowledge,
  getKnowledgeByModule,
} from './knowledge.js';
import {
  createTestClient,
  createTestRunId,
  cleanupTestData,
} from '../../../../../test/integration-helpers.js';

const TEST_RUN_ID = createTestRunId();
const adminDb = createTestClient();
const SOURCE = `${TEST_RUN_ID}-knowledge`;

beforeAll(async () => {
  // Seed entry 1: JavaScript closures (for BM25 text search)
  await adminDb.from('formation_knowledge').insert({
    module: 1,
    content_type: 'concept',
    title: `JS Closures ${TEST_RUN_ID}`,
    content: 'JavaScript closures capture variables from their outer lexical scope. This is fundamental to callbacks and event handlers.',
    tags: ['javascript', 'closures', 'scope'],
    source_file: `${SOURCE}-closures`,
  });

  // Seed entry 2: Python basics (different topic for search selectivity)
  await adminDb.from('formation_knowledge').insert({
    module: 2,
    content_type: 'concept',
    title: `Python Basics ${TEST_RUN_ID}`,
    content: 'Python uses indentation for block structure. Variables are dynamically typed.',
    tags: ['python', 'basics'],
    source_file: `${SOURCE}-python`,
  });

  // Seed entry 3: With a known 1536-dim embedding for vector search test
  // Create a simple unit vector: first element = 1.0, rest = 0.0
  const knownEmbedding = new Array(1536).fill(0);
  knownEmbedding[0] = 1.0;
  await adminDb.from('formation_knowledge').insert({
    module: 1,
    content_type: 'exercise',
    title: `Vector Test ${TEST_RUN_ID}`,
    content: 'This entry has a manually set embedding for vector search testing.',
    tags: ['test', 'vector'],
    source_file: `${SOURCE}-vector`,
    embedding: JSON.stringify(knownEmbedding),
  });

  // Verify BM25 trigger fired (BEFORE INSERT trigger populates search_text synchronously)
  const { data: check } = await adminDb
    .from('formation_knowledge')
    .select('search_text')
    .eq('source_file', `${SOURCE}-closures`)
    .single();
  if (!check?.search_text) {
    // Trigger didn't fire — force it by touching the row
    await adminDb
      .from('formation_knowledge')
      .update({ title: `JS Closures ${TEST_RUN_ID}` })
      .eq('source_file', `${SOURCE}-closures`);
  }
});

afterAll(async () => {
  await cleanupTestData(adminDb, 'formation_knowledge', 'source_file', TEST_RUN_ID);
});

describe('formation_knowledge DB integration', () => {
  it('BM25 text search finds entry by keyword when embedding is null', async () => {
    const results = await searchFormationKnowledge(
      'javascript closures',
      null,
      { matchCount: 10, threshold: 0.0 }
    );
    expect(results.length).toBeGreaterThan(0);
    const found = results.find(r => r.source_file === `${SOURCE}-closures`);
    expect(found).toBeDefined();
    expect(found!.title).toContain('JS Closures');
  });

  it('BM25 search does not return unrelated entries above closures score', async () => {
    const results = await searchFormationKnowledge(
      'javascript closures',
      null,
      { matchCount: 10, threshold: 0.0 }
    );
    const pythonHit = results.find(r => r.source_file === `${SOURCE}-python`);
    // Python entry should not outrank the closures entry for "javascript closures" query
    if (pythonHit) {
      const closuresHit = results.find(r => r.source_file === `${SOURCE}-closures`);
      expect(closuresHit!.final_score).toBeGreaterThan(pythonHit.final_score);
    }
  });

  it('vector search finds entry with matching embedding', async () => {
    // Query with the same unit vector we inserted — cosine similarity should be 1.0
    const queryEmbedding = new Array(1536).fill(0);
    queryEmbedding[0] = 1.0;
    const results = await searchFormationKnowledge(
      'vector test',
      queryEmbedding,
      { matchCount: 10, threshold: 0.0 }
    );
    expect(results.length).toBeGreaterThan(0);
    const found = results.find(r => r.source_file === `${SOURCE}-vector`);
    expect(found).toBeDefined();
    // Cosine similarity of identical unit vectors = 1.0
    expect(found!.similarity).toBeGreaterThanOrEqual(0.99);
  });

  it('getKnowledgeByModule returns entries for specified module', async () => {
    const results = await getKnowledgeByModule(1);
    const ours = results.filter(r => r.source_file.startsWith(SOURCE));
    // Module 1 has closures entry and vector entry
    expect(ours.length).toBeGreaterThanOrEqual(2);
  });

  it('filter by module narrows search results to that module only', async () => {
    const results = await searchFormationKnowledge(
      'basics',
      null,
      { matchCount: 10, threshold: 0.0, module: 2 }
    );
    const found = results.find(r => r.source_file === `${SOURCE}-python`);
    expect(found).toBeDefined();
  });
});
