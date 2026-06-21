import { Worker } from 'bullmq';
import { getQueueConnection } from '../queues/connection.js';
import { SLA_QUEUE_NAME } from '../queues/sla.queue.js';
import { handleSlaBreach } from '../../shared/services/applicationRuntime.service.js';
import { logger } from '../logger/index.js';

/** @type {Worker | null} */
let slaWorker = null;

export function startSlaWorker() {
  if (slaWorker) return slaWorker;

  slaWorker = new Worker(
    SLA_QUEUE_NAME,
    async (job) => {
      await handleSlaBreach(job.data);
    },
    {
      connection: getQueueConnection(),
      concurrency: 3,
    },
  );

  slaWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, data: job?.data }, 'SLA job failed');
  });

  logger.info('SLA worker started');
  return slaWorker;
}

export async function stopSlaWorker() {
  if (slaWorker) {
    await slaWorker.close();
    slaWorker = null;
  }
}
