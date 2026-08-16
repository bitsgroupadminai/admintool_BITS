import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../logger/index.js';

const useTls = env.REDIS_URL.startsWith('rediss://');

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    connectTimeout: 8_000,
    ...(useTls ? { tls: true, rejectUnauthorized: false } : {}),
  },
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

/**
 * Connect to Redis
 * @returns {Promise<import('redis').RedisClientType>}
 */
export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info('Redis connected');
  }
  return redisClient;
}
