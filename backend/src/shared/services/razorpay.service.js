import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../core/config/env.js';
import { AppError } from '../../core/utils/AppError.js';

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

/**
 * @param {{ amountPaise: number, currency?: string, receipt: string, notes?: Record<string, string> }} params
 */
export async function createRazorpayOrder({ amountPaise, currency = 'INR', receipt, notes = {} }) {
  const razorpay = getClient();
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes,
  });
  return order;
}

export function verifyRazorpayPaymentSignature(orderId, paymentId, signature) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Online payments are not configured', 503);
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === signature;
}
