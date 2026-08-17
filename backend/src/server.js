import http from 'http';

/**
 * Bind the port BEFORE loading env/app graphs so Railway healthchecks pass
 * even if bootstrap is slow or partially fails.
 */
const port = Number(process.env.PORT || 5000);

/** @type {(req: import('http').IncomingMessage, res: import('http').ServerResponse) => void | null} */
let appHandler = null;

const server = http.createServer((req, res) => {
  const pathOnly = (req.url ?? '/').split('?')[0];

  if (!appHandler && pathOnly === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        message: 'Server is listening',
        server: {
          listening: true,
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        },
      }),
    );
    return;
  }

  if (appHandler) {
    appHandler(req, res);
    return;
  }

  res.writeHead(503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'starting', message: 'Application is still booting' }));
});

function logError(label, err) {
  // Avoid importing the logger until after listen.
  console.error(JSON.stringify({ msg: label, err: String(err?.stack || err) }));
}

process.on('unhandledRejection', (err) => {
  logError('unhandledRejection', err);
});

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err);
});

async function shutdown() {
  console.log(JSON.stringify({ msg: 'Shutting down server...' }));
  try {
    const { stopEmailWorker } = await import('./core/workers/email.worker.js');
    const { stopSlaWorker } = await import('./core/workers/sla.worker.js');
    const { stopEmbeddingWorker } = await import('./core/workers/embedding.worker.js');
    const { stopAiVerificationWorker } = await import('./core/workers/ai-verification.worker.js');
    const { stopOfferingExpiryJob } = await import('./core/workers/offeringExpiry.worker.js');
    const { stopHealthMonitor } = await import('./core/workers/healthMonitor.worker.js');
    const { stopOperationsWorker } = await import('./core/workers/operations.worker.js');
    const { closeOperationsQueue } = await import('./core/queues/operations.queue.js');
    const { closeEmailQueue } = await import('./core/queues/email.queue.js');
    const { closeSlaQueue } = await import('./core/queues/sla.queue.js');
    const { closeEmbeddingQueue } = await import('./core/queues/embedding.queue.js');
    const { closeAiVerificationQueue } = await import('./core/queues/ai-verification.queue.js');
    const { closeWebSocket } = await import('./core/config/websocket.js');
    const { closeQueueConnection } = await import('./core/queues/connection.js');

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
  } catch (err) {
    logError('shutdown error', err);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function start() {
  await new Promise((resolve, reject) => {
    server.listen(port, '0.0.0.0', (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(JSON.stringify({ msg: `Server listening on 0.0.0.0:${port}` }));
      resolve();
    });
  });

  try {
    const { logger } = await import('./core/logger/index.js');
    const { default: app } = await import('./app.js');
    const { initWebSocket } = await import('./core/config/websocket.js');
    const { connectDb } = await import('./core/config/db.js');
    const { connectRedis } = await import('./core/config/redis.js');
    const { verifyEmailTransport } = await import('./core/services/email.service.js');
    const { startEmailWorker } = await import('./core/workers/email.worker.js');
    const { startSlaWorker } = await import('./core/workers/sla.worker.js');
    const { startEmbeddingWorker } = await import('./core/workers/embedding.worker.js');
    const { startAiVerificationWorker } = await import('./core/workers/ai-verification.worker.js');
    const { startOfferingExpiryJob } = await import('./core/workers/offeringExpiry.worker.js');
    const { startOperationsWorker } = await import('./core/workers/operations.worker.js');
    const { startHealthMonitor } = await import('./core/workers/healthMonitor.worker.js');
    const { bootstrapEnrollmentServices } = await import(
      './modules/enrollment/enrollment-seed.service.js'
    );
    const { ensureTenantIndexes } = await import('./shared/helpers/tenantIndexes.helper.js');

    appHandler = app;
    initWebSocket(server);

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
    verifyEmailTransport().catch((err) => {
      logger.error({ err }, 'Background SMTP verification failed');
    });
    startHealthMonitor();
    logger.info('Application bootstrap complete');
  } catch (err) {
    logError('Dependency startup failed; HTTP /health remains available', err);
  }
}

start().catch((err) => {
  logError('Failed to start server', err);
  process.exit(1);
});
