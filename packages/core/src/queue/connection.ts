import { Redis, RedisOptions } from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';

/**
 * Creates a Redis connection for BullMQ.
 *
 * @param url - Redis URL (defaults to REDIS_URL env var or localhost:6379)
 * @param options - Additional Redis options
 * @returns Redis instance
 */
export function createRedisConnection(
  url?: string,
  options?: Partial<RedisOptions>
): Redis {
  const redisUrl = url ?? process.env['REDIS_URL'] ?? DEFAULT_REDIS_URL;

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    ...options,
  });
}

/**
 * Creates a Redis connection from environment variables.
 *
 * @throws Error if REDIS_URL is not set (in production)
 * @returns Redis instance
 */
export function createRedisConnectionFromEnv(): Redis {
  const redisUrl = process.env['REDIS_URL'];

  if (!redisUrl && process.env['NODE_ENV'] === 'production') {
    throw new Error('REDIS_URL environment variable is not set');
  }

  return createRedisConnection(redisUrl);
}
