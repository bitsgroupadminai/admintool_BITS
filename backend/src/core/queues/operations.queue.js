import { Queue } from 'bullmq';
import { getQueueConnection } from './connection.js';

export const OPERATIONS_QUEUE_NAME = 'operations-lifecycle';

export const OPERATIONS_JOB = {
  QUEUE_LIFECYCLE: 'queue-lifecycle',
  APPOINTMENT_LIFECYCLE: 'appointment-lifecycle',
};

/** @type {Queue | null} */
let operationsQueue = null;

export function getOperationsQueue() {
  if (!operationsQueue) {
    operationsQueue = new Queue(OPERATIONS_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 300,
      },
    });
  }
  return operationsQueue;
}

/**
 * @param {string} jobName
 * @param {Record<string, unknown>} data
 */
export async function enqueueOperationsJob(jobName, data) {
  return getOperationsQueue().add(jobName, data, {
    jobId: data.jobId ? String(data.jobId) : undefined,
  });
}

export async function closeOperationsQueue() {
  if (operationsQueue) {
    await operationsQueue.close();
    operationsQueue = null;
  }
}
