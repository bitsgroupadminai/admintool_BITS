import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { getQueueConnection } from '../queues/connection.js';
import { OPERATIONS_QUEUE_NAME, OPERATIONS_JOB } from '../queues/operations.queue.js';
import { logger } from '../logger/index.js';
import { processQueueLifecycleJob } from '../../modules/queue/queue.operations.service.js';
import { processAppointmentLifecycleJob } from '../../modules/appointments/appointment.operations.service.js';

/** @type {Worker | null} */
let operationsWorker = null;

export function startOperationsWorker() {
  if (operationsWorker) return operationsWorker;

  operationsWorker = new Worker(
    OPERATIONS_QUEUE_NAME,
    async (job) => {
      if (job.name === OPERATIONS_JOB.QUEUE_LIFECYCLE) {
        await processQueueLifecycleJob(job.data);
        return;
      }
      if (job.name === OPERATIONS_JOB.APPOINTMENT_LIFECYCLE) {
        await processAppointmentLifecycleJob(job.data);
        return;
      }
      throw new Error(`Unknown operations job: ${job.name}`);
    },
    {
      connection: getQueueConnection(),
      concurrency: env.OPERATIONS_QUEUE_CONCURRENCY ?? 3,
    },
  );

  operationsWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, name: job.name, action: job.data?.action }, 'Operations job completed');
  });

  operationsWorker.on('failed', (job, err) => {
    logger.error(
      { err, jobId: job?.id, name: job?.name, action: job?.data?.action },
      'Operations job failed',
    );
  });

  logger.info('Operations worker started');
  return operationsWorker;
}

export async function stopOperationsWorker() {
  if (operationsWorker) {
    await operationsWorker.close();
    operationsWorker = null;
  }
}
