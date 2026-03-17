import { logger } from '../logger.js';

const EMBEDDING_SERVER_URL = process.env['EMBEDDING_SERVER_URL'] ?? 'http://localhost:8090/embed';

interface EmbedSingleResponse {
  embedding: number[];
}

interface EmbedBatchResponse {
  embeddings: number[][];
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(EMBEDDING_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Embedding server returned error');
      return null;
    }

    const data = (await res.json()) as EmbedSingleResponse;
    return data.embedding;
  } catch (error) {
    logger.debug({ error }, 'Embedding server unavailable (graceful fallback)');
    return null;
  }
}

export async function getEmbeddings(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  try {
    const res = await fetch(EMBEDDING_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Embedding server returned error');
      return null;
    }

    const data = (await res.json()) as EmbedBatchResponse;
    return data.embeddings;
  } catch (error) {
    logger.debug({ error }, 'Embedding server unavailable (graceful fallback)');
    return null;
  }
}
