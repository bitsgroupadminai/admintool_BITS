import IORedis from 'ioredis';
import { env } from '../config/env.js';

/** @type {import('ioredis').Redis | null} */
let sharedConnection = null;

/**
 * BullMQ requires maxRetriesPerRequest to be null on worker connections.
 */
export function getQueueConnection() {
  if (!sharedConnection) {
    sharedConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return sharedConnection;
}

export async function closeQueueConnection() {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
