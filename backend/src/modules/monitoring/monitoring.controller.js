import { getHealthReport, getSimpleHealth } from './health.service.js';
import { getMetrics } from './metrics.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { env } from '../../core/config/env.js';

/**
 * GET /health and GET /api/v1/health — public probe (server + MongoDB + Redis).
 */
export async function simpleHealth(req, res, next) {
  try {
    const health = await getSimpleHealth();
    // Always 200 once HTTP is up so Railway healthchecks pass while deps reconnect.
    res.status(200).json(health);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/health/ready — readiness probe.
 * Returns 503 when a critical dependency is down.
 */
export async function readiness(req, res, next) {
  try {
    const report = await getHealthReport();
    res.status(report.status === 'unhealthy' ? 503 : 200).json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/monitoring/health — detailed dependency report (admin only).
 */
export async function adminHealth(req, res, next) {
  try {
    const health = await getHealthReport();
    sendSuccess(res, 200, 'System health', { health });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /metrics — Prometheus exposition format.
 * Protected by METRICS_TOKEN when configured.
 */
export async function metrics(req, res, next) {
  try {
    if (env.METRICS_TOKEN) {
      const authHeader = req.get('authorization');
      const bearer = authHeader?.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;
      const token = bearer || req.query.token;
      if (token !== env.METRICS_TOKEN) {
        res.status(401).type('text/plain').send('Unauthorized');
        return;
      }
    }

    const payload = await getMetrics();
    res.setHeader('Content-Type', payload.contentType);
    res.status(200).send(payload.body);
  } catch (err) {
    next(err);
  }
}
