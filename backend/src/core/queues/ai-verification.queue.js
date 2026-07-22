import { Queue } from 'bullmq';
import { getQueueConnection } from './connection.js';

export const AI_VERIFICATION_QUEUE_NAME = 'ai-verification';

export const AI_VERIFICATION_JOB = {
  VERIFY_APPLICATION: 'verify-application',
  PRESCREEN_INTAKE: 'prescreen-intake',
};

/** @type {Queue | null} */
let aiVerificationQueue = null;

export function getAiVerificationQueue() {
  if (!aiVerificationQueue) {
    aiVerificationQueue = new Queue(AI_VERIFICATION_QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 8000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return aiVerificationQueue;
}

/**
 * Enqueue AI verification of an application's current AI workflow step(s).
 * Small delay lets the triggering DB write settle before the worker reads it.
 *
 * @param {string} instituteId
 * @param {string} applicationId
 */
export async function enqueueApplicationAiVerification(instituteId, applicationId) {
  const queue = getAiVerificationQueue();
  return queue.add(
    AI_VERIFICATION_JOB.VERIFY_APPLICATION,
    { instituteId, applicationId },
    { delay: 1500 },
  );
}

/**
 * Enqueue an advisory AI pre-screen for an enrollment intake.
 *
 * @param {string} instituteId
 * @param {string} applicationId
 */
export async function enqueueIntakeAiPrescreen(instituteId, applicationId) {
  const queue = getAiVerificationQueue();
  return queue.add(
    AI_VERIFICATION_JOB.PRESCREEN_INTAKE,
    { instituteId, applicationId },
    { delay: 1500 },
  );
}

export async function closeAiVerificationQueue() {
  if (aiVerificationQueue) {
    await aiVerificationQueue.close();
    aiVerificationQueue = null;
  }
}
