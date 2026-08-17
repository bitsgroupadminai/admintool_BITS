import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../core/config/env.js';
import { AppError } from '../../core/utils/AppError.js';
import { logger } from '../../core/logger/index.js';

let client = null;

function getClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Online payments are not configured for this institute', 503);
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

export function isRazorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeyId() {
  return env.RAZORPAY_KEY_ID ?? null;
}

export function mapRazorpayError(err) {
  if (err instanceof AppError) return err;
  const description =
    err?.error?.description ||
    err?.error?.reason ||
    err?.message ||
    'Could not create a payment order';
  const providerStatus = Number(err?.statusCode);
  const statusCode = providerStatus === 401 || providerStatus === 403 ? 503 : providerStatus >= 400 && providerStatus < 500 ? 400 : 502;
  return new AppError(description, statusCode);
}

/**
 * @param {{ amountPaise: number, currency?: string, receipt: string, notes?: Record<string, string> }} params
 */
export async function createRazorpayOrder({ amountPaise, currency = 'INR', receipt, notes = {} }) {
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new AppError('Payment amount must be at least ₹1', 400);
  }

  const razorpay = getClient();
  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: String(currency || 'INR').toUpperCase(),
      receipt: String(receipt).slice(0, 40),
      notes,
    });
    if (!order?.id) {
      throw new AppError('Payment provider did not return an order', 502);
    }
    return order;
  } catch (err) {
    logger.error({ err, amountPaise, receipt }, 'Razorpay order create failed');
    throw mapRazorpayError(err);
  }
}

export function verifyRazorpayPaymentSignature(orderId, paymentId, signature) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Online payments are not configured', 503);
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === signature;
}
