import client from 'prom-client';

export const register = new client.Registry();

register.setDefaultLabels({ app: 'admintool-backend' });
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeSessionsGauge = new client.Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions stored in Redis',
  registers: [register],
});

const websocketConnectionsGauge = new client.Gauge({
  name: 'websocket_connections',
  help: 'Live WebSocket connectivity',
  labelNames: ['kind'],
  registers: [register],
});

const dependencyUpGauge = new client.Gauge({
  name: 'dependency_up',
  help: 'Dependency health (1 = up, 0 = down)',
  labelNames: ['dependency'],
  registers: [register],
});

const queueJobsGauge = new client.Gauge({
  name: 'bullmq_queue_jobs',
  help: 'BullMQ job counts by queue and state',
  labelNames: ['queue', 'state'],
  registers: [register],
});

const emailJobsTotal = new client.Counter({
  name: 'email_jobs_total',
  help: 'Total email worker jobs by result',
  labelNames: ['result'],
  registers: [register],
});

/**
 * Resolve a low-cardinality route label from an Express request.
 * @param {import('express').Request} req
 */
function resolveRoute(req) {
  const routePath = req.route?.path;
  if (routePath) {
    return `${req.baseUrl ?? ''}${routePath}` || '/';
  }
  return req.baseUrl || 'unmatched';
}

/**
 * Express middleware that records request latency and counts.
 * @type {import('express').RequestHandler}
 */
export function httpMetricsMiddleware(req, res, next) {
  const endTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: resolveRoute(req),
      status_code: String(res.statusCode),
    };
    endTimer(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
}

export function setActiveSessions(count) {
  if (Number.isFinite(count)) activeSessionsGauge.set(count);
}

/**
 * @param {{ connectedUsers: number, connectedSockets: number }} stats
 */
export function setWebsocketStats(stats) {
  websocketConnectionsGauge.set({ kind: 'users' }, stats.connectedUsers ?? 0);
  websocketConnectionsGauge.set({ kind: 'sockets' }, stats.connectedSockets ?? 0);
}

/**
 * @param {string} dependency
 * @param {boolean} up
 */
export function setDependencyUp(dependency, up) {
  dependencyUpGauge.set({ dependency }, up ? 1 : 0);
}

/**
 * @param {string} queue
 * @param {{ waiting?: number, active?: number, failed?: number, delayed?: number }} counts
 */
export function setQueueJobCounts(queue, counts) {
  queueJobsGauge.set({ queue, state: 'waiting' }, counts.waiting ?? 0);
  queueJobsGauge.set({ queue, state: 'active' }, counts.active ?? 0);
  queueJobsGauge.set({ queue, state: 'failed' }, counts.failed ?? 0);
  queueJobsGauge.set({ queue, state: 'delayed' }, counts.delayed ?? 0);
}

/**
 * @param {'completed' | 'failed'} result
 */
export function recordEmailJob(result) {
  emailJobsTotal.inc({ result });
}

/**
 * @returns {Promise<{ contentType: string, body: string }>}
 */
export async function getMetrics() {
  return {
    contentType: register.contentType,
    body: await register.metrics(),
  };
}
