import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { getQueueConnection } from '../queues/connection.js';
import { AI_VERIFICATION_QUEUE_NAME, AI_VERIFICATION_JOB } from '../queues/ai-verification.queue.js';
import {
  runApplicationAiVerification,
  runIntakeAiPrescreen,
} from '../../modules/ai-verification/ai-verification.service.js';
import { logger } from '../logger/index.js';

/** @type {Worker | null} */
let aiVerificationWorker = null;

export function startAiVerificationWorker() {
  if (aiVerificationWorker) return aiVerificationWorker;

  aiVerificationWorker = new Worker(
    AI_VERIFICATION_QUEUE_NAME,
    async (job) => {
      const { instituteId, applicationId } = job.data;

      if (job.name === AI_VERIFICATION_JOB.PRESCREEN_INTAKE) {
        return runIntakeAiPrescreen({ instituteId, applicationId });
      }

      return runApplicationAiVerification({ instituteId, applicationId });
    },
    {
      connection: getQueueConnection(),
      concurrency: env.AI_VERIFICATION_QUEUE_CONCURRENCY,
    },
  );

  aiVerificationWorker.on('completed', (job, result) => {
    logger.info(
      { jobId: job.id, applicationId: job.data?.applicationId, result },
      'AI verification job completed',
    );
  });

  aiVerificationWorker.on('failed', (job, err) => {
    logger.error(
      { err, jobId: job?.id, applicationId: job?.data?.applicationId },
      'AI verification job failed',
    );
  });

  logger.info('AI verification worker started');
  return aiVerificationWorker;
}

export async function stopAiVerificationWorker() {
  if (aiVerificationWorker) {
    await aiVerificationWorker.close();
    aiVerificationWorker = null;
  }
}
