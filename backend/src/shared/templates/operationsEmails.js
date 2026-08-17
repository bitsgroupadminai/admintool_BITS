import { queueEmailNotification } from '../../core/services/email.service.js';
import { buildHtmlEmail } from './emailLayout.js';
import { PRIORITY_LABELS } from '../helpers/queuePriority.helper.js';
import { MEETING_PROVIDER } from '../enums/operations.enums.js';

function providerLabel(provider) {
  if (provider === MEETING_PROVIDER.ZOOM) return 'Zoom';
  if (provider === MEETING_PROVIDER.GOOGLE_MEET) return 'Google Meet';
  return 'Online meeting';
}

/**
 * @param {{ applicantName: string, instituteName: string, ticketNumber: number, position: number, estimatedWaitLabel?: string, priority?: string, priorityReason?: string, studentPortalUrl: string, serviceLink?: string }} params
 */
export function buildQueueJoinedEmail(params) {
  const {
    applicantName,
    instituteName,
    ticketNumber,
    position,
    estimatedWaitLabel,
    priority,
    priorityReason,
    studentPortalUrl,
    serviceLink,
  } = params;

  const priorityLine =
    priority && priority !== 'normal'
      ? `<br/><strong>Priority:</strong> ${PRIORITY_LABELS[priority] ?? priority}${priorityReason ? ` — ${priorityReason}` : ''}`
      : '';

  const subject = `${instituteName}: Queue ticket #${ticketNumber}`;
  const text = [
    `Hello ${applicantName},`,
    '',
    `You joined the walk-in queue. Ticket #${ticketNumber}, position ${position}.`,
    estimatedWaitLabel ? `Estimated wait: ${estimatedWaitLabel}.` : '',
    priority && priority !== 'normal' ? `Priority: ${PRIORITY_LABELS[priority] ?? priority}.` : '',
    '',
    `Track your queue: ${serviceLink ?? studentPortalUrl}`,
    '',
    `— ${instituteName}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    text,
    html: buildHtmlEmail({
      headline: `Queue ticket #${ticketNumber}`,
      intro: `Hello ${applicantName},`,
      body: `You are in the walk-in queue at position <strong>${position}</strong>.${estimatedWaitLabel ? `<br/>Estimated wait: <strong>${estimatedWaitLabel}</strong>.` : ''}${priorityLine}`,
      ctaLabel: 'View queue status',
      ctaUrl: serviceLink ?? studentPortalUrl,
      instituteName,
    }),
  };
}

/**
 * @param {{ applicantName: string, instituteName: string, ticketNumber: number, counterLabel?: string, priority?: string, studentPortalUrl: string, serviceLink?: string }} params
 */
export function buildQueueCalledEmail(params) {
  const { applicantName, instituteName, ticketNumber, counterLabel, studentPortalUrl, serviceLink } =
    params;

  const subject = `${instituteName}: You're up — ticket #${ticketNumber}`;
  const destination = counterLabel ? `Please proceed to ${counterLabel}.` : 'Please proceed to the service counter.';

  return {
    subject,
    text: [
      `Hello ${applicantName},`,
      '',
      `Your queue ticket #${ticketNumber} has been called.`,
      destination,
      '',
      `— ${instituteName}`,
    ].join('\n'),
    html: buildHtmlEmail({
      headline: "You're up!",
      intro: `Hello ${applicantName},`,
      body: `Your queue ticket <strong>#${ticketNumber}</strong> has been called.<br/>${destination}`,
      ctaLabel: 'Open student portal',
      ctaUrl: serviceLink ?? studentPortalUrl,
      instituteName,
    }),
  };
}

/**
 * @param {{ applicantName: string, instituteName: string, ticketNumber: number, priority: string, priorityReason?: string, studentPortalUrl: string, serviceLink?: string }} params
 */
export function buildQueuePriorityEmail(params) {
  const { applicantName, instituteName, ticketNumber, priority, priorityReason, serviceLink, studentPortalUrl } =
    params;

  const label = PRIORITY_LABELS[priority] ?? priority;
  const subject = `${instituteName}: Queue priority updated — ticket #${ticketNumber}`;

  return {
    subject,
    text: [
      `Hello ${applicantName},`,
      '',
      `Your queue ticket #${ticketNumber} priority is now: ${label}.`,
      priorityReason ? `Reason: ${priorityReason}` : '',
      '',
      `— ${instituteName}`,
    ]
      .filter(Boolean)
      .join('\n'),
    html: buildHtmlEmail({
      headline: 'Queue priority updated',
      intro: `Hello ${applicantName},`,
      body: `Your ticket <strong>#${ticketNumber}</strong> is now marked as <strong>${label}</strong>.${priorityReason ? `<br/>Reason: ${priorityReason}` : ''}`,
      ctaLabel: 'View queue status',
      ctaUrl: serviceLink ?? studentPortalUrl,
      instituteName,
    }),
  };
}

/**
 * @param {{ recipientName: string, instituteName: string, offeringName: string, slotStart: Date, visitMode: string, studentPortalUrl: string, serviceLink?: string }} params
 */
export function buildAppointmentBookedEmail(params) {
  const { recipientName, instituteName, offeringName, slotStart, visitMode, serviceLink, studentPortalUrl } =
    params;

  const isVirtual = visitMode === 'virtual';
  const subject = `${instituteName}: Appointment booked — ${offeringName}`;
  const when = new Date(slotStart).toLocaleString();

  return {
    subject,
    text: [
      `Hello ${recipientName},`,
      '',
      `Your ${isVirtual ? 'virtual ' : ''}appointment for ${offeringName} is scheduled for ${when}.`,
      isVirtual ? 'A meeting link will be shared once confirmed by staff.' : '',
      '',
      `— ${instituteName}`,
    ]
      .filter(Boolean)
      .join('\n'),
    html: buildHtmlEmail({
      headline: isVirtual ? 'Virtual appointment booked' : 'Appointment booked',
      intro: `Hello ${recipientName},`,
      body: `Your appointment for <strong>${offeringName}</strong> is scheduled for <strong>${when}</strong>.${isVirtual ? '<br/>You will receive the online meeting link once staff confirms the session.' : ''}`,
      ctaLabel: 'View appointment',
      ctaUrl: serviceLink ?? studentPortalUrl,
      instituteName,
    }),
  };
}

/**
 * @param {{ recipientName: string, instituteName: string, offeringName: string, slotStart: Date, provider: string, meetingLink: string, meetingId?: string, passcode?: string, role?: string }} params
 */
export function buildVirtualMeetingEmail(params) {
  const {
    recipientName,
    instituteName,
    offeringName,
    slotStart,
    provider,
    meetingLink,
    meetingId,
    passcode,
    role = 'participant',
  } = params;

  const when = new Date(slotStart).toLocaleString();
  const subject = `${instituteName}: Virtual meeting link — ${offeringName}`;

  const details = [
    meetingLink ? `Join link: ${meetingLink}` : '',
    meetingId ? `Meeting ID: ${meetingId}` : '',
    passcode ? `Passcode: ${passcode}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const bodyHtml = [
    `Your virtual appointment for <strong>${offeringName}</strong> is on <strong>${when}</strong>.`,
    `<br/><strong>Platform:</strong> ${providerLabel(provider)}`,
    `<br/><strong>Join link:</strong> <a href="${meetingLink}">${meetingLink}</a>`,
    meetingId ? `<br/><strong>Meeting ID:</strong> ${meetingId}` : '',
    passcode ? `<br/><strong>Passcode:</strong> ${passcode}` : '',
    role === 'host' ? '<br/>You are listed as the host for this session.' : '',
  ].join('');

  return {
    subject,
    text: [
      `Hello ${recipientName},`,
      '',
      `Virtual appointment: ${offeringName}`,
      `Scheduled: ${when}`,
      `Platform: ${providerLabel(provider)}`,
      details,
      '',
      `— ${instituteName}`,
    ].join('\n'),
    html: buildHtmlEmail({
      headline: 'Your virtual meeting link',
      intro: `Hello ${recipientName},`,
      body: bodyHtml,
      ctaLabel: 'Join meeting',
      ctaUrl: meetingLink,
      instituteName,
    }),
  };
}

/**
 * @param {{ recipientName: string, instituteName: string, offeringName: string, slotStart: Date, studentPortalUrl: string }} params
 */
export function buildAppointmentRescheduledEmail(params) {
  const { recipientName, instituteName, offeringName, slotStart, studentPortalUrl } = params;
  const when = new Date(slotStart).toLocaleString();
  const subject = `${instituteName}: Appointment rescheduled — ${offeringName}`;

  return {
    subject,
    text: [
      `Hello ${recipientName},`,
      '',
      `Your appointment for ${offeringName} has been moved to ${when}.`,
      '',
      `— ${instituteName}`,
    ].join('\n'),
    html: buildHtmlEmail({
      headline: 'Appointment rescheduled',
      intro: `Hello ${recipientName},`,
      body: `Your appointment for <strong>${offeringName}</strong> is now scheduled for <strong>${when}</strong>.`,
      ctaLabel: 'View appointment',
      ctaUrl: studentPortalUrl,
      instituteName,
    }),
  };
}

/**
 * @param {{ recipientName: string, instituteName: string, offeringName: string, slotStart: Date, studentPortalUrl: string }} params
 */
export function buildAppointmentCancelledEmail(params) {
  const { recipientName, instituteName, offeringName, slotStart, studentPortalUrl } = params;
  const when = new Date(slotStart).toLocaleString();
  const subject = `${instituteName}: Appointment cancelled — ${offeringName}`;

  return {
    subject,
    text: [
      `Hello ${recipientName},`,
      '',
      `Your appointment for ${offeringName} on ${when} was cancelled.`,
      'You may book a new slot when ready.',
      '',
      `— ${instituteName}`,
    ].join('\n'),
    html: buildHtmlEmail({
      headline: 'Appointment cancelled',
      intro: `Hello ${recipientName},`,
      body: `Your appointment for <strong>${offeringName}</strong> on <strong>${when}</strong> was cancelled. You can book a new slot when ready.`,
      ctaLabel: 'Book again',
      ctaUrl: studentPortalUrl,
      instituteName,
    }),
  };
}

export async function sendQueueJoinedEmail(params) {
  const email = buildQueueJoinedEmail(params);
  return queueEmailNotification({
    to: params.applicantEmail,
    type: 'queue-joined',
    ...email,
  });
}

export async function sendQueueCalledEmail(params) {
  const email = buildQueueCalledEmail(params);
  return queueEmailNotification({
    to: params.applicantEmail,
    type: 'queue-called',
    ...email,
  });
}

export async function sendQueuePriorityEmail(params) {
  const email = buildQueuePriorityEmail(params);
  return queueEmailNotification({
    to: params.applicantEmail,
    type: 'queue-priority-updated',
    ...email,
  });
}

export async function sendAppointmentBookedEmail(params) {
  const email = buildAppointmentBookedEmail(params);
  return queueEmailNotification({
    to: params.applicantEmail,
    type: 'appointment-booked',
    ...email,
  });
}

export async function sendVirtualMeetingEmail(params) {
  const email = buildVirtualMeetingEmail(params);
  return queueEmailNotification({
    to: params.recipientEmail,
    type: 'virtual-meeting-link',
    ...email,
  });
}

export async function sendAppointmentRescheduledEmail(params) {
  const email = buildAppointmentRescheduledEmail(params);
  return queueEmailNotification({
    to: params.applicantEmail,
    type: 'appointment-rescheduled',
    ...email,
  });
}

export async function sendAppointmentCancelledEmail(params) {
  const email = buildAppointmentCancelledEmail(params);
  return queueEmailNotification({
    to: params.applicantEmail,
    type: 'appointment-cancelled',
    ...email,
  });
}

export { getStudentPortalUrl } from '../helpers/portalUrls.helper.js';
