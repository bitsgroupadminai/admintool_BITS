import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { getQueueConnection } from '../queues/connection.js';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue.js';
import { deliverEmail } from '../services/email.service.js';
import { recordEmailJob } from '../../modules/monitoring/metrics.js';
import { logger } from '../logger/index.js';

/** @type {Worker | null} */
let emailWorker = null;

export function startEmailWorker() {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      await deliverEmail(job.data);
    },
    {
      connection: getQueueConnection(),
      concurrency: env.EMAIL_QUEUE_CONCURRENCY,
    },
  );

  emailWorker.on('completed', (job) => {
    recordEmailJob('completed');
    logger.info({ jobId: job.id, type: job.data.type, to: job.data.to }, 'Email job completed');
  });

  emailWorker.on('failed', (job, err) => {
    recordEmailJob('failed');
    logger.error(
      { err, jobId: job?.id, type: job?.data?.type, to: job?.data?.to },
      'Email job failed',
    );
  });

  logger.info('Email worker started');
  return emailWorker;
}

export async function stopEmailWorker() {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
  }
}
