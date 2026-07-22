import { getHealthReport } from '../../modules/monitoring/health.service.js';
import {
  setDependencyUp,
  setActiveSessions,
  setWebsocketStats,
  setQueueJobCounts,
} from '../../modules/monitoring/metrics.js';
import { countActiveSessions } from '../services/session.service.js';
import { getWebsocketStats } from '../config/websocket.js';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';

/** @type {NodeJS.Timeout | null} */
let timer = null;
/** @type {Map<string, string>} */
const lastStatus = new Map();

async function runHealthChecks() {
  const report = await getHealthReport();

  for (const [dependency, info] of Object.entries(report.dependencies)) {
    const up = info.status === 'up' || info.status === 'not_configured';
    setDependencyUp(dependency, up);

    const previous = lastStatus.get(dependency);
    if (previous && previous !== info.status) {
      if (info.status === 'down') {
        logger.error({ dependency, info }, `ALERT: dependency "${dependency}" is DOWN`);
      } else if (previous === 'down') {
        logger.info({ dependency, info }, `RECOVERED: dependency "${dependency}" is ${info.status}`);
      }
    }
    lastStatus.set(dependency, info.status);
  }

  for (const [queue, counts] of Object.entries(report.queues ?? {})) {
    setQueueJobCounts(queue, counts);
  }

  if (report.status !== 'healthy') {
    logger.warn({ status: report.status }, 'System health is not fully healthy');
  }

  try {
    setActiveSessions(await countActiveSessions());
  } catch (err) {
    logger.warn({ err }, 'Failed to count active sessions for metrics');
  }
  setWebsocketStats(getWebsocketStats());
}

export function startHealthMonitor() {
  if (!env.HEALTH_MONITOR_ENABLED) {
    logger.info('Health monitor disabled');
    return;
  }
  if (timer) return;

  runHealthChecks().catch((err) => {
    logger.error({ err }, 'Initial health check failed');
  });

  timer = setInterval(() => {
    runHealthChecks().catch((err) => {
      logger.error({ err }, 'Health check failed');
    });
  }, env.HEALTH_MONITOR_INTERVAL_MS);

  logger.info('Health monitor started');
}

export function stopHealthMonitor() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
