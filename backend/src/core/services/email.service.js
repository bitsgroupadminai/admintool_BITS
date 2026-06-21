import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';
import { enqueueEmailJob } from '../queues/email.queue.js';

/** @type {import('nodemailer').Transporter | null} */
let transporter = null;

function resolveSmtpHost() {
  if (env.SMTP_HOST) return env.SMTP_HOST;
  if (env.SMTP_USER?.includes('@gmail.com')) return 'smtp.gmail.com';
  return undefined;
}

function getTransporter() {
  if (transporter) return transporter;

  const host = resolveSmtpHost();
  if (host && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS.replace(/\s+/g, ''),
      },
    });
    return transporter;
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

  const info = await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  if (!resolveSmtpHost()) {
    logger.info({ to, subject, type, preview: text }, 'Email logged (SMTP not configured)');
  } else {
    logger.info({ to, subject, type, messageId: info.messageId }, 'Email sent');
  }

  return info;
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
  if (!resolveSmtpHost() || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP credentials not configured — emails will be logged only');
    return false;
  }

  try {
    await getTransporter().verify();
    logger.info('SMTP transport verified');
    return true;
  } catch (err) {
    logger.error({ err }, 'SMTP transport verification failed');
    return false;
  }
}
