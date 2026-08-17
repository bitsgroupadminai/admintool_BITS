import { queueEmailNotification } from '../../core/services/email.service.js';
import { buildHtmlEmail } from './emailLayout.js';
import { getStudentPortalUrl } from '../helpers/portalUrls.helper.js';

function formatReceiptAmount(amountPaise, currency = 'INR') {
  const amount = amountPaise / 100;
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${currency} ${amount.toFixed(2)}`;
}

function formatPaidAt(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
}

/**
 * @param {{
 *   payment: import('../../modules/payments/payment.model.js').Payment;
 *   application: import('../../modules/applications/application.model.js').Application;
 *   offering: import('../../modules/offerings/offering.model.js').Offering;
 *   serviceName: string;
 *   instituteName: string;
 * }} params
 */
export function buildPaymentReceiptEmail({
  payment,
  application,
  offering,
  serviceName,
  instituteName,
}) {
  const amountDisplay = formatReceiptAmount(payment.amountPaise, payment.currency);
  const paidAtDisplay = formatPaidAt(payment.paidAt);
  const studentPortalUrl = getStudentPortalUrl();
  const subject = `${instituteName}: Payment receipt — ${payment.label}`;

  const text = [
    `Hello ${application.applicantName},`,
    '',
    'Thank you. Your payment was received successfully.',
    '',
    `Fee: ${payment.label}`,
    `Amount: ${amountDisplay}`,
    `Service: ${serviceName}`,
    `Option: ${offering.name}`,
    `Paid on: ${paidAtDisplay}`,
    `Receipt reference: ${payment.razorpayPaymentId ?? payment.razorpayOrderId}`,
    `Order ID: ${payment.razorpayOrderId}`,
    '',
    `View your request: ${studentPortalUrl}/services`,
    '',
    `— ${instituteName}`,
  ].join('\n');

  const html = buildHtmlEmail({
    headline: 'Payment receipt',
    intro: `Hello ${application.applicantName},`,
    body: `
      <p>Thank you — we received your payment for <strong>${payment.label}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 0;width:100%;border-collapse:separate;border:1px solid #E2EEE8;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:12px 16px;background:#F9FCFB;font-size:13px;color:#4B6358;width:40%;">Amount</td><td style="padding:12px 16px;font-size:14px;font-weight:600;color:#052E1C;">${amountDisplay}</td></tr>
        <tr><td style="padding:12px 16px;background:#FFFFFF;font-size:13px;color:#4B6358;">Service</td><td style="padding:12px 16px;font-size:14px;color:#052E1C;">${serviceName}</td></tr>
        <tr><td style="padding:12px 16px;background:#F9FCFB;font-size:13px;color:#4B6358;">Option</td><td style="padding:12px 16px;font-size:14px;color:#052E1C;">${offering.name}</td></tr>
        <tr><td style="padding:12px 16px;background:#FFFFFF;font-size:13px;color:#4B6358;">Paid on</td><td style="padding:12px 16px;font-size:14px;color:#052E1C;">${paidAtDisplay}</td></tr>
        <tr><td style="padding:12px 16px;background:#F9FCFB;font-size:13px;color:#4B6358;">Payment ID</td><td style="padding:12px 16px;font-size:13px;color:#052E1C;font-family:monospace;">${payment.razorpayPaymentId ?? '—'}</td></tr>
        <tr><td style="padding:12px 16px;background:#FFFFFF;font-size:13px;color:#4B6358;">Order ID</td><td style="padding:12px 16px;font-size:13px;color:#052E1C;font-family:monospace;">${payment.razorpayOrderId}</td></tr>
      </table>
    `,
    ctaLabel: 'Open student portal',
    ctaUrl: `${studentPortalUrl}/services`,
    instituteName,
  });

  return { subject, text, html };
}

/**
 * @param {{
 *   payment: import('../../modules/payments/payment.model.js').Payment;
 *   application: import('../../modules/applications/application.model.js').Application;
 *   offering: import('../../modules/offerings/offering.model.js').Offering;
 *   serviceName: string;
 *   instituteName: string;
 * }} params
 */
export async function notifyPaymentReceipt(params) {
  const { application } = params;
  const email = buildPaymentReceiptEmail(params);
  return queueEmailNotification({
    to: application.applicantEmail,
    subject: email.subject,
    text: email.text,
    html: email.html,
    type: 'payment_receipt',
  });
}
