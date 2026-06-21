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
import { startOfferingExpiryJob, stopOfferingExpiryJob } from './core/workers/offeringExpiry.worker.js';
import { startOperationsWorker, stopOperationsWorker } from './core/workers/operations.worker.js';
import { closeOperationsQueue } from './core/queues/operations.queue.js';
import { closeEmailQueue } from './core/queues/email.queue.js';
import { closeSlaQueue } from './core/queues/sla.queue.js';
import { closeEmbeddingQueue } from './core/queues/embedding.queue.js';
import { closeQueueConnection } from './core/queues/connection.js';
import { logger } from './core/logger/index.js';

import { bootstrapEnrollmentServices } from './modules/enrollment/enrollment-seed.service.js';

async function shutdown() {
  logger.info('Shutting down server...');
  await stopEmailWorker();
  await stopSlaWorker();
  await stopEmbeddingWorker();
  stopOfferingExpiryJob();
  await stopOperationsWorker();
  await closeOperationsQueue();
  await closeEmailQueue();
  await closeSlaQueue();
  await closeEmbeddingQueue();
  await closeWebSocket();
  await closeQueueConnection();
  process.exit(0);
}

async function start() {
  await connectDb();
  await connectRedis();
  await bootstrapEnrollmentServices();
  startOperationsWorker();
  startEmailWorker();
  startSlaWorker();
  startEmbeddingWorker();
  startOfferingExpiryJob();
  await verifyEmailTransport();

  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
