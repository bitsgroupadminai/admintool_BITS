import { Queue } from 'bullmq';
import { getQueueConnection } from './connection.js';

export const EMAIL_QUEUE_NAME = 'email-notifications';

/** @type {Queue | null} */
let emailQueue = null;

/**
 * @typedef {Object} EmailJobData
 * @property {string} to
 * @property {string} subject
 * @property {string} text
 * @property {string} [html]
 * @property {string} [type]
 */

export function getEmailQueue() {
  if (!emailQueue) {
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return emailQueue;
}

/**
 * @param {EmailJobData} data
 */
export async function enqueueEmailJob(data) {
  const queue = getEmailQueue();
  return queue.add(data.type ?? 'generic-email', data);
}

export async function closeEmailQueue() {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
}
