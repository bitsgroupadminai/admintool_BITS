import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';
import { enqueueEmailJob } from '../queues/email.queue.js';

/** @type {import('nodemailer').Transporter | null} */
let transporter = null;

/** Gmail cold connects from cloud hosts often exceed 8–10s. */
const SMTP_VERIFY_TIMEOUT_MS = 30_000;
const SMTP_CONNECTION_TIMEOUT_MS = 25_000;
const SMTP_SOCKET_TIMEOUT_MS = 45_000;

function resolveSmtpHost() {
  if (env.SMTP_HOST) return env.SMTP_HOST;
  if (env.SMTP_USER?.includes('@gmail.com')) return 'smtp.gmail.com';
  return undefined;
}

function isSmtpConfigured() {
  return Boolean(resolveSmtpHost() && env.SMTP_USER && env.SMTP_PASS);
}

/**
 * Gmail rejects mail when From ≠ authenticated user.
 * Keep display name from SMTP_FROM but force the address to SMTP_USER when they differ.
 */
export function resolveSmtpFrom() {
  const configured = String(env.SMTP_FROM ?? '').trim();
  const user = String(env.SMTP_USER ?? '').trim();
  if (!user) return configured || 'EduPortal <noreply@localhost>';

  const angle = configured.match(/^(.*)<([^>]+)>\s*$/);
  const fromAddress = (angle ? angle[2] : configured).trim().toLowerCase();
  const userAddress = user.toLowerCase();

  if (!fromAddress || fromAddress === userAddress || fromAddress.includes('localhost')) {
    if (angle?.[1]?.trim()) {
      return `${angle[1].trim()} <${user}>`;
    }
    return configured.includes('<') ? configured : `EduPortal <${user}>`;
  }

  if (fromAddress !== userAddress) {
    logger.warn(
      { smtpFrom: configured, smtpUser: user },
      'SMTP_FROM address does not match SMTP_USER; sending as SMTP_USER to avoid provider rejection',
    );
    const display = angle?.[1]?.trim() || 'EduPortal';
    return `${display} <${user}>`;
  }

  return configured;
}

function resetTransporter() {
  transporter = null;
}

function buildSmtpTransportOptions() {
  const host = resolveSmtpHost();
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS.replace(/\s+/g, '');
  const isGmail = host === 'smtp.gmail.com' || user?.includes('@gmail.com');

  // Prefer well-known Gmail settings; fall back to explicit host/port.
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

function getTransporter() {
  if (transporter) return transporter;

  if (isSmtpConfigured()) {
    transporter = nodemailer.createTransport(buildSmtpTransportOptions());
    return transporter;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'SMTP is not configured in production (set SMTP_HOST/SMTP_USER/SMTP_PASS). Emails cannot be delivered.',
    );
  }

  transporter = nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

/**
 * Sends an email immediately. Used by the BullMQ worker only.
 * @param {{ to: string, subject: string, text: string, html?: string, type?: string }} params
 */
export async function deliverEmail({ to, subject, text, html, type }) {
  if (!env.EMAIL_NOTIFICATIONS_ENABLED) {
    logger.info({ to, subject, type }, 'Email notifications disabled');
    return null;
  }

  try {
    const info = await getTransporter().sendMail({
      from: resolveSmtpFrom(),
      to,
      subject,
      text,
      html,
    });

    if (!isSmtpConfigured()) {
      logger.info({ to, subject, type, preview: text }, 'Email logged (SMTP not configured)');
    } else {
      logger.info({ to, subject, type, messageId: info.messageId }, 'Email sent');
    }

    return info;
  } catch (err) {
    resetTransporter();
    logger.error({ err, to, subject, type }, 'Email delivery failed');
    throw err;
  }
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

  if (env.NODE_ENV === 'production' && !isSmtpConfigured()) {
    const err = new Error('Cannot queue email: SMTP is not configured in production');
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

export async function verifyEmailTransport() {
  if (!isSmtpConfigured()) {
    logger.warn('SMTP credentials not configured — emails will be logged only');
    return false;
  }

  try {
    const transport = getTransporter();
    const verifyPromise = transport.verify();
    // Prevent a late verify() rejection from becoming an unhandledRejection
    // (which can crash the Railway process after a timeout wins the race).
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
    resetTransporter();
    logger.error(
      { err, host: resolveSmtpHost(), user: env.SMTP_USER },
      'SMTP transport verification failed — check SMTP_USER/SMTP_PASS app password and network access to smtp.gmail.com',
    );
    return false;
  }
}
