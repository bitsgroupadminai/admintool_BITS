import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';
import { enqueueEmailJob } from '../queues/email.queue.js';

/** @type {import('nodemailer').Transporter | null} */
let transporter = null;

const SMTP_VERIFY_TIMEOUT_MS = 8_000;

function resolveSmtpHost() {
  if (env.SMTP_HOST) return env.SMTP_HOST;
  if (env.SMTP_USER?.includes('@gmail.com')) return 'smtp.gmail.com';
  return undefined;
}

function isSmtpConfigured() {
  return Boolean(resolveSmtpHost() && env.SMTP_USER && env.SMTP_PASS);
}

/**
 * Gmail (and most SMTP providers) reject mail when From ≠ authenticated user.
 * Keep a display name from SMTP_FROM but force the address to SMTP_USER when they differ.
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

function getTransporter() {
  if (transporter) return transporter;

  const host = resolveSmtpHost();
  if (host && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: !env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS.replace(/\s+/g, ''),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: {
        minVersion: 'TLSv1.2',
        servername: host,
      },
    });
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
    await Promise.race([
      transport.verify(),
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
      'SMTP transport verification failed — check SMTP_USER/SMTP_PASS app password and outbound port 587 from the host',
    );
    return false;
  }
}
