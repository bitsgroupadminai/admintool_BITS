import { Queue } from 'bullmq';
import { getQueueConnection } from './connection.js';

export const SLA_QUEUE_NAME = 'sla-monitors';

/** @type {Queue | null} */
let slaQueue = null;

/**
 * @typedef {Object} SlaJobData
 * @property {string} applicationId
 * @property {string} instituteId
 * @property {string} stepId
 */

export function getSlaQueue() {
  if (!slaQueue) {
    slaQueue = new Queue(SLA_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return slaQueue;
}

/**
 * @param {SlaJobData} data
 * @param {Date} dueAt
 */
export async function scheduleSlaMonitorJob(data, dueAt) {
  const delay = Math.max(1000, dueAt.getTime() - Date.now());
  const queue = getSlaQueue();
  const jobId = `sla:${data.applicationId}:${data.stepId}`;

  const existing = await queue.getJob(jobId);
  if (existing) {
    await existing.remove();
  }

  return queue.add('sla-breach-check', data, {
    jobId,
    delay,
  });
}

export async function cancelSlaMonitorJob(applicationId, stepId) {
  const queue = getSlaQueue();
  const jobId = `sla:${applicationId}:${stepId}`;
  const existing = await queue.getJob(jobId);
  if (existing) {
    await existing.remove();
  }
}

export async function closeSlaQueue() {
  if (slaQueue) {
    await slaQueue.close();
    slaQueue = null;
  }
}
