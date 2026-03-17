import { createClient, type RedisClientType } from 'redis';
import { logger } from '../logger.js';

let redis: RedisClientType | null = null;
let connectionFailed = false;

export async function getRedis(): Promise<RedisClientType | null> {
  if (connectionFailed) return null;
  if (redis?.isOpen) return redis;

  const url = process.env['REDIS_URL'];
  if (!url) {
    logger.debug('REDIS_URL not set, cache disabled');
    connectionFailed = true;
    return null;
  }

  try {
    redis = createClient({ url });
    redis.on('error', (err) => {
      logger.debug({ err }, 'Redis client error');
    });
    await redis.connect();
    logger.info('Redis connected');
    return redis;
  } catch (error) {
    logger.debug({ error }, 'Redis connection failed, cache disabled');
    connectionFailed = true;
    redis = null;
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getRedis();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = await getRedis();
  if (!client) return;

  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // non-critical
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch {
    // non-critical
  }
}
