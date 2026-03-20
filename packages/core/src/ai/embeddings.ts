import { logger } from '../logger.js';

const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];
const MODEL = 'text-embedding-3-small';
const API_URL = 'https://api.openai.com/v1/embeddings';

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    logger.debug('OPENAI_API_KEY not set, skipping embedding');
    return null;
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: text }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'OpenAI embedding API error');
      return null;
    }

    const data = (await res.json()) as OpenAIEmbeddingResponse;
    return data.data[0]?.embedding ?? null;
  } catch (error) {
    logger.warn({ error }, 'OpenAI embedding request failed');
    return null;
  }
}

export async function getEmbeddings(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  if (!OPENAI_API_KEY) {
    logger.debug('OPENAI_API_KEY not set, skipping batch embedding');
    return null;
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: texts }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'OpenAI batch embedding API error');
      return null;
    }

    const data = (await res.json()) as OpenAIEmbeddingResponse;
    // Sort by index to match input order
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  } catch (error) {
    logger.warn({ error }, 'OpenAI batch embedding request failed');
    return null;
  }
}
