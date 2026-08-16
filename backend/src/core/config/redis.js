import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../logger/index.js';

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    connectTimeout: 8_000,
    reconnectStrategy: false,
    tls: env.REDIS_URL.startsWith('rediss://') ? true : undefined,
    rejectUnauthorized: false,
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
