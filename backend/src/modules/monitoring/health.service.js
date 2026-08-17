import mongoose from 'mongoose';
import { redisClient } from '../../core/config/redis.js';
import { getQueueConnection } from '../../core/queues/connection.js';
import { getEmailQueue, EMAIL_QUEUE_NAME } from '../../core/queues/email.queue.js';
import { getOperationsQueue, OPERATIONS_QUEUE_NAME } from '../../core/queues/operations.queue.js';
import { getSlaQueue, SLA_QUEUE_NAME } from '../../core/queues/sla.queue.js';
import { getEmbeddingQueue, EMBEDDING_QUEUE_NAME } from '../../core/queues/embedding.queue.js';
import {
  getAiVerificationQueue,
  AI_VERIFICATION_QUEUE_NAME,
} from '../../core/queues/ai-verification.queue.js';
import { getWebsocketStats } from '../../core/config/websocket.js';
import { verifyEmailTransport } from '../../core/services/email.service.js';
import { env } from '../../core/config/env.js';

/** Dependencies whose failure makes the service "unhealthy" (not just degraded). */
export const CRITICAL_DEPENDENCIES = ['mongodb', 'redis', 'queue'];

const EMAIL_CHECK_TTL_MS = 2 * 60 * 1000;
let emailCache = { status: null, checkedAt: 0 };

async function timed(fn) {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function checkMongo() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'down', error: 'not connected' };
    }
    const latencyMs = await timed(() => mongoose.connection.db.admin().ping());
    return { status: 'up', latencyMs };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

async function checkRedis() {
  try {
    const latencyMs = await timed(() => redisClient.ping());
    return { status: 'up', latencyMs };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

async function checkQueueRedis() {
  try {
    const latencyMs = await timed(() => getQueueConnection().ping());
    return { status: 'up', latencyMs };
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

async function checkEmail() {
  const configured = Boolean(env.SMTP_USER && env.SMTP_PASS);
  if (!configured) {
    return { status: 'not_configured' };
  }

  const now = Date.now();
  if (emailCache.status && now - emailCache.checkedAt < EMAIL_CHECK_TTL_MS) {
    return { status: emailCache.status, cached: true };
  }

  try {
    const ok = await verifyEmailTransport();
    emailCache = { status: ok ? 'up' : 'down', checkedAt: now };
    return { status: emailCache.status };
  } catch (err) {
    emailCache = { status: 'down', checkedAt: now };
    return { status: 'down', error: err.message };
  }
}

function checkWebsocket() {
  const stats = getWebsocketStats();
  return {
    status: stats.initialized ? 'up' : 'down',
    connectedUsers: stats.connectedUsers,
    connectedSockets: stats.connectedSockets,
  };
}

/**
 * @param {import('bullmq').Queue} queue
 */
async function readQueueCounts(queue) {
  const [waiting, active, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, failed, delayed };
}

/**
 * Snapshot BullMQ depths for the health report and Prometheus gauges.
 * Failures for individual queues are swallowed so health stays available.
 */
export async function getQueueDepths() {
  const entries = [
    [EMAIL_QUEUE_NAME, getEmailQueue],
    [OPERATIONS_QUEUE_NAME, getOperationsQueue],
    [SLA_QUEUE_NAME, getSlaQueue],
    [EMBEDDING_QUEUE_NAME, getEmbeddingQueue],
    [AI_VERIFICATION_QUEUE_NAME, getAiVerificationQueue],
  ];

  const result = {};
  await Promise.all(
    entries.map(async ([name, getQueue]) => {
      try {
        result[name] = await readQueueCounts(getQueue());
      } catch (err) {
        result[name] = {
          waiting: 0,
          active: 0,
          failed: 0,
          delayed: 0,
          error: err.message,
        };
      }
    }),
  );
  return result;
}

/**
 * Run all dependency probes and compute an overall status.
 * @returns {Promise<{
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   timestamp: string,
 *   uptimeSeconds: number,
 *   dependencies: Record<string, { status: string } & Record<string, unknown>>,
 *   queues: Record<string, { waiting: number, active: number, failed: number, delayed: number }>,
 * }>}
 */
export async function getHealthReport() {
  const [mongodb, redis, queue, email, queues] = await Promise.all([
    checkMongo(),
    checkRedis(),
    checkQueueRedis(),
    checkEmail(),
    getQueueDepths(),
  ]);
  const websocket = checkWebsocket();

  const dependencies = { mongodb, redis, queue, email, websocket };

  const criticalDown = CRITICAL_DEPENDENCIES.some(
    (dep) => dependencies[dep].status === 'down',
  );
  const anyDown = Object.values(dependencies).some((dep) => dep.status === 'down');

  let status = 'healthy';
  if (criticalDown) status = 'unhealthy';
  else if (anyDown) status = 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    dependencies,
    queues,
  };
}

/**
 * Lightweight public probe: server up + MongoDB + Redis.
 * @returns {Promise<{
 *   status: 'healthy' | 'degraded' | 'unhealthy',
 *   message: string,
 *   server: { listening: true, uptimeSeconds: number, timestamp: string },
 *   mongodb: { status: string, latencyMs?: number, error?: string },
 *   redis: { status: string, latencyMs?: number, error?: string },
 * }>}
 */
export async function getSimpleHealth() {
  const [mongodb, redis] = await Promise.all([checkMongo(), checkRedis()]);

  let status = 'healthy';
  if (mongodb.status === 'down' || redis.status === 'down') {
    status = mongodb.status === 'down' && redis.status === 'down' ? 'unhealthy' : 'degraded';
  }

  const message =
    status === 'healthy'
      ? 'Server is listening; MongoDB and Redis are up'
      : status === 'degraded'
        ? 'Server is listening; one dependency is down'
        : 'Server is listening; MongoDB and Redis are down';

  return {
    status,
    message,
    server: {
      listening: true,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    mongodb,
    redis,
  };
}
