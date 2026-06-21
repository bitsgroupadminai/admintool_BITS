import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { getQueueConnection } from '../queues/connection.js';
import { EMBEDDING_QUEUE_NAME } from '../queues/embedding.queue.js';
import { indexServiceKnowledge, purgeServiceIndex } from '../../shared/services/rag.service.js';
import { KnowledgeDocument } from '../../modules/knowledge-documents/knowledgeDocument.model.js';
import { logger } from '../logger/index.js';

/** @type {Worker | null} */
let embeddingWorker = null;

export function startEmbeddingWorker() {
  if (embeddingWorker) return embeddingWorker;

  embeddingWorker = new Worker(
    EMBEDDING_QUEUE_NAME,
    async (job) => {
      const { instituteId, serviceId } = job.data;

      if (job.name === 'purge-service') {
        await purgeServiceIndex(instituteId, serviceId);
        return { purged: true };
      }

      await KnowledgeDocument.updateMany(
        { instituteId, serviceId },
        { indexStatus: 'indexing', indexError: null },
      );

      try {
        const result = await indexServiceKnowledge(instituteId, serviceId);
        return result;
      } catch (err) {
        await KnowledgeDocument.updateMany(
          { instituteId, serviceId },
          { indexStatus: 'failed', indexError: err?.message ?? 'Indexing failed' },
        );
        throw err;
      }
    },
    {
      connection: getQueueConnection(),
      concurrency: env.EMBEDDING_QUEUE_CONCURRENCY,
    },
  );

  embeddingWorker.on('completed', (job, result) => {
    logger.info(
      { jobId: job.id, serviceId: job.data.serviceId, chunkCount: result?.chunkCount },
      'Embedding job completed',
    );
  });

  embeddingWorker.on('failed', (job, err) => {
    logger.error(
      { err, jobId: job?.id, serviceId: job?.data?.serviceId },
      'Embedding job failed',
    );
  });

  logger.info('Embedding worker started');
  return embeddingWorker;
}

export async function stopEmbeddingWorker() {
  if (embeddingWorker) {
    await embeddingWorker.close();
    embeddingWorker = null;
  }
}
