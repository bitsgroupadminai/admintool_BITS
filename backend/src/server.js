import http from 'http';
import app from './app.js';
import { env } from './core/config/env.js';
import { connectDb } from './core/config/db.js';
import { connectRedis } from './core/config/redis.js';
import { initWebSocket, closeWebSocket } from './core/config/websocket.js';
import { verifyEmailTransport } from './core/services/email.service.js';
import { startEmailWorker, stopEmailWorker } from './core/workers/email.worker.js';
import { startSlaWorker, stopSlaWorker } from './core/workers/sla.worker.js';
import { startEmbeddingWorker, stopEmbeddingWorker } from './core/workers/embedding.worker.js';
import { startAiVerificationWorker, stopAiVerificationWorker } from './core/workers/ai-verification.worker.js';
import { startOfferingExpiryJob, stopOfferingExpiryJob } from './core/workers/offeringExpiry.worker.js';
import { startOperationsWorker, stopOperationsWorker } from './core/workers/operations.worker.js';
import { startHealthMonitor, stopHealthMonitor } from './core/workers/healthMonitor.worker.js';
import { closeOperationsQueue } from './core/queues/operations.queue.js';
import { closeEmailQueue } from './core/queues/email.queue.js';
import { closeSlaQueue } from './core/queues/sla.queue.js';
import { closeEmbeddingQueue } from './core/queues/embedding.queue.js';
import { closeAiVerificationQueue } from './core/queues/ai-verification.queue.js';
import { closeQueueConnection } from './core/queues/connection.js';
import { logger } from './core/logger/index.js';

import { bootstrapEnrollmentServices } from './modules/enrollment/enrollment-seed.service.js';
import { ensureTenantIndexes } from './shared/helpers/tenantIndexes.helper.js';

async function shutdown() {
  logger.info('Shutting down server...');
  await stopEmailWorker();
  await stopSlaWorker();
  await stopEmbeddingWorker();
  await stopAiVerificationWorker();
  stopOfferingExpiryJob();
  stopHealthMonitor();
  await stopOperationsWorker();
  await closeOperationsQueue();
  await closeEmailQueue();
  await closeSlaQueue();
  await closeEmbeddingQueue();
  await closeAiVerificationQueue();
  await closeWebSocket();
  await closeQueueConnection();
  process.exit(0);
}

async function connectDependencies() {
  await connectDb();
  await ensureTenantIndexes();
  await connectRedis();
  await bootstrapEnrollmentServices();
  startOperationsWorker();
  startEmailWorker();
  startSlaWorker();
  startEmbeddingWorker();
  startAiVerificationWorker();
  startOfferingExpiryJob();
  // Never block or crash startup on SMTP — Railway healthchecks need /health immediately.
  verifyEmailTransport().catch((err) => {
    logger.error({ err }, 'Background SMTP verification failed');
  });
  startHealthMonitor();
}

async function start() {
  const server = http.createServer(app);
  initWebSocket(server);

  await new Promise((resolve, reject) => {
    server.listen(env.PORT, '0.0.0.0', (err) => {
      if (err) {
        reject(err);
        return;
      }
      logger.info(`Server listening on 0.0.0.0:${env.PORT}`);
      resolve();
    });
  });

  try {
    await connectDependencies();
  } catch (err) {
    logger.error({ err }, 'Dependency startup failed; HTTP /health remains available');
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
