export const STUDENT_EMAIL_SUBJECT_MAX = 200;
export const STUDENT_EMAIL_HEADLINE_MAX = 200;
export const STUDENT_EMAIL_BODY_MAX = 4000;

export const DEFAULT_PAYMENT_METHODS =
  'UPI, credit/debit cards, net banking, and wallets';

export const STUDENT_EMAIL_PLACEHOLDERS = [
  '{{applicantName}}',
  '{{offeringName}}',
  '{{serviceName}}',
  '{{instituteName}}',
  '{{dashboardUrl}}',
  '{{paymentAmount}}',
  '{{paymentLabel}}',
  '{{paymentMethods}}',
  '{{nextStepName}}',
  '{{courseStartDate}}',
  '{{campusLocation}}',
  '{{accommodationDetails}}',
];

/**
 * @param {unknown} value
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Object} [email]
 */
export function normalizeStudentEmail(email = {}) {
  return {
    subject: String(email.subject ?? '').trim().slice(0, STUDENT_EMAIL_SUBJECT_MAX),
    headline: String(email.headline ?? '').trim().slice(0, STUDENT_EMAIL_HEADLINE_MAX),
    body: String(email.body ?? '').trim().slice(0, STUDENT_EMAIL_BODY_MAX),
  };
}

/**
 * @param {Object} [step]
 */
export function hasStudentEmailTemplate(step) {
  const email = normalizeStudentEmail(step?.studentEmail);
  return Boolean(email.subject && email.body);
}

/**
 * @param {string} [name]
 */
export function classifyWorkflowEmailKind(name = '') {
  const label = String(name).toLowerCase();
  if (/offer/.test(label)) return 'offer_release';
  if (/fee|payment/.test(label)) return 'fee_payment';
  if (/confirm/.test(label)) return 'admission_confirmation';
  if (/seat|merit|allocat/.test(label)) return 'seat_allocation';
  if (/eligib/.test(label)) return 'eligibility';
  if (/document/.test(label)) return 'document_verification';
  return 'progress';
}

function clip(text, max) {
  return String(text ?? '').trim().slice(0, max);
}

/**
 * @param {Object} step
 * @param {{ nextStepName?: string }} [options]
 */
export function canonicalStudentEmailTemplate(step, options = {}) {
  const kind = classifyWorkflowEmailKind(step?.name);
  const nextStepName = options.nextStepName || 'the next step';
  const stepName = step?.name || 'this step';

  const templates = {
    document_verification: {
      subject: 'Your documents have been checked — {{offeringName}}',
      headline: 'Your documents look good',
      body: `Hello {{applicantName}},

Good news — we have finished checking the documents you uploaded for {{offeringName}} under {{serviceName}}.

You do not need to do anything right now. We will continue with {{nextStepName}} and email you when there is an update.

Track your request anytime: {{dashboardUrl}}

Warm regards,
{{instituteName}}`,
    },
    eligibility: {
      subject: 'You meet the eligibility rules — {{offeringName}}',
      headline: 'You are a strong fit for this programme',
      body: `Hello {{applicantName}},

We have reviewed your academic details for {{offeringName}}, and you meet the eligibility rules for this course.

Next, the institute will work on {{nextStepName}}. There is nothing you need to submit at this stage.

Dashboard: {{dashboardUrl}}

Warm regards,
{{instituteName}}`,
    },
    seat_allocation: {
      subject: 'A seat is being arranged — {{offeringName}}',
      headline: 'A seat is being arranged for you',
      body: `Hello {{applicantName}},

Admissions staff have completed seat allocation for {{offeringName}}. You are being considered for an offer based on merit, your preferences, and available seats.

The next step is {{nextStepName}}. We will email you as soon as your offer is ready.

Dashboard: {{dashboardUrl}}

Warm regards,
{{instituteName}}`,
    },
    offer_release: {
      subject: 'Congratulations — your admission offer for {{offeringName}}',
      headline: 'Congratulations — you have received an offer',
      body: `Hello {{applicantName}},

Congratulations! We are delighted to offer you a seat in {{offeringName}} at {{instituteName}}.

You were found eligible, and we believe you are a wonderful fit for this course. We are excited to welcome you.

Here is what happens next:

1. Fee payment
Please complete your {{paymentLabel}} of {{paymentAmount}} from your student dashboard:
{{dashboardUrl}}

You can pay using {{paymentMethods}}. Keep a copy of the receipt after you pay.

2. Admission confirmation
After your payment is received, the institute will complete a final admission check. In that step we will share:
• Your course start date (currently {{courseStartDate}})
• Your joining date and reporting instructions
• Campus location: {{campusLocation}}
• Accommodation: {{accommodationDetails}}

If anything is unclear, open your dashboard or write to the admissions office. We are here to help.

With warm wishes,
{{instituteName}}`,
    },
    fee_payment: {
      subject: 'We received your payment — {{offeringName}}',
      headline: 'Thank you — your fee has been received',
      body: `Hello {{applicantName}},

Thank you. We have received your {{paymentLabel}} of {{paymentAmount}} for {{offeringName}}.

The next step is {{nextStepName}}. The institute will complete a final check and then share your joining details, course start date, and campus accommodation information.

Dashboard: {{dashboardUrl}}

Warm regards,
{{instituteName}}`,
    },
    admission_confirmation: {
      subject: 'Welcome — your admission is confirmed for {{offeringName}}',
      headline: 'Your admission is confirmed',
      body: `Hello {{applicantName}},

Welcome to {{instituteName}}! Your admission to {{offeringName}} under {{serviceName}} is confirmed.

What this final step covers:
• Course start date: {{courseStartDate}}
• Joining / reporting instructions will be shared by the admissions office
• Campus: {{campusLocation}}
• Accommodation: {{accommodationDetails}}

Please keep checking your dashboard for any last documents or orientation notes:
{{dashboardUrl}}

We look forward to seeing you on campus.

Warm regards,
{{instituteName}}`,
    },
    progress: {
      subject: `Update on your request — ${stepName}`,
      headline: `${stepName} is complete`,
      body: `Hello {{applicantName}},

The institute has completed “${stepName}” for your {{offeringName}} request.

Next: {{nextStepName}}.
Open your dashboard for details: {{dashboardUrl}}

Warm regards,
{{instituteName}}`,
    },
  };

  const chosen = templates[kind] ?? templates.progress;
  return {
    subject: clip(chosen.subject, STUDENT_EMAIL_SUBJECT_MAX),
    headline: clip(chosen.headline, STUDENT_EMAIL_HEADLINE_MAX),
    body: clip(chosen.body, STUDENT_EMAIL_BODY_MAX),
  };
}

/**
 * @param {Object[]} steps
 */
export function applyCanonicalStudentEmails(steps = []) {
  const sorted = [...steps].sort((a, b) => Number(a.order) - Number(b.order));
  return sorted.map((step, index) => {
    const existing = normalizeStudentEmail(step.studentEmail);
    if (existing.subject && existing.body) {
      return { ...step, studentEmail: existing };
    }
    const nextStepName = sorted[index + 1]?.name || 'the next step';
    return {
      ...step,
      studentEmail: canonicalStudentEmailTemplate(step, { nextStepName }),
    };
  });
}

/**
 * @param {Object[]} steps
 * @param {{ order: number, subject?: string, headline?: string, body?: string }[]} generated
 */
export function mergeGeneratedStudentEmails(steps = [], generated = []) {
  const byOrder = new Map((generated ?? []).map((item) => [Number(item.order), item]));
  const sorted = [...steps].sort((a, b) => Number(a.order) - Number(b.order));
  return sorted.map((step, index) => {
    const existing = normalizeStudentEmail(step.studentEmail);
    if (existing.subject && existing.body) {
      return { ...step, studentEmail: existing };
    }
    const ai = byOrder.get(Number(step.order));
    const aiEmail = normalizeStudentEmail(ai);
    if (aiEmail.subject && aiEmail.body) {
      return { ...step, studentEmail: aiEmail };
    }
    const nextStepName = sorted[index + 1]?.name || 'the next step';
    return {
      ...step,
      studentEmail: canonicalStudentEmailTemplate(step, { nextStepName }),
    };
  });
}

function formatInrAmount(amount, currency = 'INR') {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'the published programme fee';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `₹${numeric.toLocaleString('en-IN')}`;
  }
}

function formatDisplayDate(value) {
  if (!value) return 'the date shared at admission confirmation';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'the date shared at admission confirmation';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * @param {Object} [offering]
 */
export function describeAccommodation(offering = {}) {
  const location = String(offering.visitLocation ?? '').trim();
  const instructions = String(offering.visitInstructions ?? '').trim();
  if (location && instructions) {
    return `${instructions} Campus / reporting location: ${location}.`;
  }
  if (instructions) return instructions;
  if (location) {
    return `Campus housing and hostel allotment details (if you applied for accommodation) will be shared at confirmation. Reporting location: ${location}.`;
  }
  return 'Campus housing and hostel allotment details, if you have applied for accommodation, will be shared during admission confirmation along with joining formalities.';
}

/**
 * @param {Object} application
 * @param {Object} [context]
 * @param {Object} [offering]
 */
export function buildStudentEmailVars(application, context = {}, offering = {}) {
  const payment = offering.paymentConfig ?? {};
  const studentPortalUrl = context.studentPortalUrl || '';
  const serviceId = application.serviceId?.toString?.() ?? application.serviceId ?? '';
  const dashboardUrl = serviceId
    ? `${studentPortalUrl.replace(/\/$/, '')}/services/${serviceId}`
    : `${studentPortalUrl.replace(/\/$/, '')}/services`;

  return {
    applicantName: application.applicantName || 'there',
    offeringName: context.offeringName || offering.name || 'your programme',
    serviceName: context.serviceName || 'this service',
    instituteName: context.instituteName || 'Your institute',
    dashboardUrl,
    paymentAmount: payment.enabled
      ? formatInrAmount(payment.amount, payment.currency)
      : 'the published programme fee',
    paymentLabel: payment.label?.trim() || 'admission fee',
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    nextStepName: context.nextStepName || 'the next step',
    courseStartDate: formatDisplayDate(offering.startDate),
    campusLocation: String(offering.visitLocation ?? '').trim() || 'details shared at confirmation',
    accommodationDetails: describeAccommodation(offering),
  };
}

/**
 * @param {string} template
 * @param {Record<string, string>} vars
 * @param {{ html?: boolean }} [options]
 */
export function interpolateStudentEmail(template, vars, options = {}) {
  let output = String(template ?? '');
  for (const [key, value] of Object.entries(vars)) {
    const token = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    output = output.replace(token, options.html ? escapeHtml(value) : String(value ?? ''));
  }
  return output;
}

/**
 * @param {string} text
 */
export function studentEmailBodyToHtml(text) {
  return escapeHtml(text)
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br/>');
}
