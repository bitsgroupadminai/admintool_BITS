import { Queue } from 'bullmq';
import { getQueueConnection } from './connection.js';

export const EMBEDDING_QUEUE_NAME = 'knowledge-embedding';

/** @type {Queue | null} */
let embeddingQueue = null;

export function getEmbeddingQueue() {
  if (!embeddingQueue) {
    embeddingQueue = new Queue(EMBEDDING_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return embeddingQueue;
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {'service-reindex' | 'document-delete'} [reason]
 */
export async function enqueueServiceReindex(instituteId, serviceId, reason = 'service-reindex') {
  const queue = getEmbeddingQueue();
  const jobId = `reindex:${instituteId}:${serviceId}`;
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'waiting' || state === 'delayed' || state === 'active') {
      return existing;
    }
  }

  return queue.add(
    'index-service',
    { instituteId, serviceId, reason },
    { jobId, delay: 1500 },
  );
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 */
export async function enqueueServicePurge(instituteId, serviceId) {
  const queue = getEmbeddingQueue();
  return queue.add('purge-service', { instituteId, serviceId });
}

export async function closeEmbeddingQueue() {
  if (embeddingQueue) {
    await embeddingQueue.close();
    embeddingQueue = null;
  }
}
