import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';
import { enqueueEmailJob } from '../queues/email.queue.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_DOMAINS_URL = 'https://api.resend.com/domains';
const RESEND_TIMEOUT_MS = 15_000;

/** Gmail cold connects from cloud hosts often exceed 8–10s. */
const SMTP_VERIFY_TIMEOUT_MS = 30_000;
const SMTP_CONNECTION_TIMEOUT_MS = 25_000;
const SMTP_SOCKET_TIMEOUT_MS = 45_000;

/** @type {import('nodemailer').Transporter | null} */
let smtpTransporter = null;

export function isResendConfigured() {
  return Boolean(env.RESEND_API_KEY);
}

function resolveSmtpHost() {
  if (env.SMTP_HOST) return env.SMTP_HOST;
  if (env.SMTP_USER?.includes('@gmail.com')) return 'smtp.gmail.com';
  return undefined;
}

export function isSmtpConfigured() {
  return Boolean(resolveSmtpHost() && env.SMTP_USER && env.SMTP_PASS);
}

export function isEmailConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

/**
 * From header for Resend. EMAIL_FROM wins; SMTP_FROM is the legacy alias.
 */
export function resolveEmailFrom() {
  const from = String(env.EMAIL_FROM || env.SMTP_FROM || '').trim();
  return from || 'CampusFlow <onboarding@resend.dev>';
}

/**
 * Gmail rejects mail when From ≠ authenticated user.
 * Keep display name from SMTP_FROM / EMAIL_FROM but force the address to SMTP_USER.
 */
export function resolveSmtpFrom() {
  const configured = String(env.SMTP_FROM || env.EMAIL_FROM || '').trim();
  const user = String(env.SMTP_USER ?? '').trim();
  if (!user) return configured || 'CampusFlow <noreply@localhost>';

  const angle = configured.match(/^(.*)<([^>]+)>\s*$/);
  const fromAddress = (angle ? angle[2] : configured).trim().toLowerCase();
  const userAddress = user.toLowerCase();

  if (!fromAddress || fromAddress === userAddress || fromAddress.includes('localhost')) {
    if (angle?.[1]?.trim()) {
      return `${angle[1].trim()} <${user}>`;
    }
    return configured.includes('<') ? configured : `CampusFlow <${user}>`;
  }

  if (fromAddress !== userAddress) {
    logger.warn(
      { smtpFrom: configured, smtpUser: user },
      'SMTP From address does not match SMTP_USER; sending as SMTP_USER to avoid provider rejection',
    );
    const display = angle?.[1]?.trim() || 'CampusFlow';
    return `${display} <${user}>`;
  }

  return configured;
}

function resetSmtpTransporter() {
  smtpTransporter = null;
}

function buildSmtpTransportOptions() {
  const host = resolveSmtpHost();
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS.replace(/\s+/g, '');
  const isGmail = host === 'smtp.gmail.com' || user?.includes('@gmail.com');

  if (isGmail) {
    return {
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    };
  }

  return {
    host,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    auth: { user, pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    tls: {
      minVersion: 'TLSv1.2',
      servername: host,
    },
  };
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  if (isSmtpConfigured()) {
    smtpTransporter = nodemailer.createTransport(buildSmtpTransportOptions());
    return smtpTransporter;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'SMTP backup is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS).',
    );
  }

  smtpTransporter = nodemailer.createTransport({ jsonTransport: true });
  return smtpTransporter;
}

async function resendRequest(url, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload?.message || payload?.error?.message || `Resend HTTP ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.payload = payload;
      throw err;
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function deliverViaResend({ to, subject, text, html, type }) {
  const result = await resendRequest(RESEND_API_URL, {
    method: 'POST',
    body: {
      from: resolveEmailFrom(),
      to: [to],
      subject,
      text,
      html: html || undefined,
    },
  });
  logger.info({ to, subject, type, provider: 'resend', messageId: result?.id }, 'Email sent');
  return result;
}

async function deliverViaSmtp({ to, subject, text, html, type }) {
  try {
    const info = await getSmtpTransporter().sendMail({
      from: resolveSmtpFrom(),
      to,
      subject,
      text,
      html,
    });

    if (!isSmtpConfigured()) {
      logger.info({ to, subject, type, provider: 'smtp-json' }, 'Email logged (SMTP not configured)');
    } else {
      logger.info(
        { to, subject, type, provider: 'smtp', messageId: info.messageId },
        'Email sent',
      );
    }
    return info;
  } catch (err) {
    resetSmtpTransporter();
    throw err;
  }
}

/**
 * Sends an email immediately. Used by the BullMQ worker only.
 * Production prefers Resend and falls back to Nodemailer SMTP.
 * @param {{ to: string, subject: string, text: string, html?: string, type?: string }} params
 */
export async function deliverEmail({ to, subject, text, html, type }) {
  if (!env.EMAIL_NOTIFICATIONS_ENABLED) {
    logger.info({ to, subject, type }, 'Email notifications disabled');
    return null;
  }

  if (isResendConfigured()) {
    try {
      return await deliverViaResend({ to, subject, text, html, type });
    } catch (err) {
      if (isSmtpConfigured()) {
        logger.warn(
          { err, to, subject, type },
          'Resend delivery failed; falling back to SMTP (Nodemailer)',
        );
        return deliverViaSmtp({ to, subject, text, html, type });
      }
      logger.error({ err, to, subject, type }, 'Email delivery failed');
      throw err;
    }
  }

  if (isSmtpConfigured() || env.NODE_ENV !== 'production') {
    return deliverViaSmtp({ to, subject, text, html, type });
  }

  const err = new Error(
    'Email is not configured in production (set RESEND_API_KEY, or SMTP_USER/SMTP_PASS as backup).',
  );
  logger.error({ err, to, subject, type }, 'Email delivery failed');
  throw err;
}

/**
 * Queue an email background job via BullMQ.
 * @param {{ to: string, subject: string, text: string, html?: string, type?: string }} params
 */
export async function queueEmailNotification(params) {
  if (!env.EMAIL_NOTIFICATIONS_ENABLED) {
    logger.info({ to: params.to, subject: params.subject, type: params.type }, 'Email notifications disabled');
    return null;
  }

  if (env.NODE_ENV === 'production' && !isEmailConfigured()) {
    const err = new Error('Cannot queue email: set RESEND_API_KEY (or SMTP backup) in production');
    logger.error({ err, type: params.type, to: params.to }, 'Email queue rejected');
    throw err;
  }

  return enqueueEmailJob(params);
}

/**
 * @deprecated Use queueEmailNotification instead.
 * @param {() => Promise<unknown>} task
 */
export function queueEmail(task) {
  task().catch((err) => {
    logger.error({ err }, 'Legacy queued email task failed');
  });
}

async function verifySmtpTransport() {
  if (!isSmtpConfigured()) return false;

  try {
    const transport = getSmtpTransporter();
    const verifyPromise = transport.verify();
    verifyPromise.catch(() => {});

    await Promise.race([
      verifyPromise,
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`SMTP verify timed out after ${SMTP_VERIFY_TIMEOUT_MS}ms`)),
          SMTP_VERIFY_TIMEOUT_MS,
        );
      }),
    ]);
    logger.info({ host: resolveSmtpHost(), user: env.SMTP_USER }, 'SMTP transport verified');
    return true;
  } catch (err) {
    resetSmtpTransporter();
    logger.error(
      { err, host: resolveSmtpHost(), user: env.SMTP_USER },
      'SMTP transport verification failed',
    );
    return false;
  }
}

export async function verifyEmailTransport() {
  if (isResendConfigured()) {
    try {
      await resendRequest(RESEND_DOMAINS_URL);
      logger.info({ from: resolveEmailFrom() }, 'Resend API key verified');
      return true;
    } catch (err) {
      logger.error(
        { err, from: resolveEmailFrom() },
        'Resend verification failed — checking SMTP backup',
      );
      if (isSmtpConfigured()) {
        return verifySmtpTransport();
      }
      return false;
    }
  }

  if (isSmtpConfigured()) {
    return verifySmtpTransport();
  }

  logger.warn('RESEND_API_KEY / SMTP credentials not configured — emails will be logged only');
  return false;
}
