import { env } from '../../core/config/env.js';
import { queueEmailNotification } from '../../core/services/email.service.js';
import { buildHtmlEmail } from './emailLayout.js';

const STATUS_MESSAGES = {
  submitted: {
    subject: 'Your request was submitted',
    headline: 'Request submitted successfully',
    body: 'Your institute has received your request and will review it soon.',
  },
  in_review: {
    subject: 'Your request is under review',
    headline: 'Your request is now under review',
    body: 'A staff member from your institute is reviewing your request and documents.',
  },
  admitted: {
    subject: 'Your request was approved',
    headline: 'Good news — your request was approved',
    body: 'Your institute has approved this request. Contact the office if you need anything else.',
  },
  needs_correction: {
    subject: 'Action needed on your request',
    headline: 'Please update your request',
    body: 'Your institute needs corrections before they can continue reviewing your request.',
  },
  rejected: {
    subject: 'Update on your request',
    headline: 'Your request was not approved',
    body: 'Your institute could not approve this request. Contact the office if you need help.',
  },
  pending_authorization: {
    subject: 'Enrollment request received',
    headline: 'We received your enrollment request',
    body: 'Your institute is reviewing whether you are authorized to start this programme. You will receive another email once the review is complete.',
  },
};

/**
 * @param {{ applicantName: string, serviceName: string, offeringName: string, instituteName: string, studentPortalUrl: string }} params
 */
export function buildSubmittedEmail(params) {
  const { applicantName, serviceName, offeringName, instituteName, studentPortalUrl } = params;
  const subject = `${instituteName}: Request submitted for ${serviceName}`;
  const text = [
    `Hello ${applicantName},`,
    '',
    `Your request for ${offeringName} under ${serviceName} at ${instituteName} was submitted successfully.`,
    'We will notify you when the status changes.',
    '',
    `Track your request: ${studentPortalUrl}/services`,
    '',
    `— ${instituteName}`,
  ].join('\n');

  return {
    subject,
    text,
    html: buildHtmlEmail({
      headline: 'Request submitted successfully',
      intro: `Hello ${applicantName},`,
      body: `Your request for <strong>${offeringName}</strong> under <strong>${serviceName}</strong> was submitted successfully.`,
      ctaLabel: 'Open student portal',
      ctaUrl: `${studentPortalUrl}/services`,
      instituteName,
    }),
  };
}

/**
 * @param {{ applicantName: string, status: string, serviceName: string, offeringName: string, instituteName: string, studentPortalUrl: string }} params
 */
export function buildStatusUpdateEmail(params) {
  const { applicantName, status, serviceName, offeringName, instituteName, studentPortalUrl } =
    params;
  const copy = STATUS_MESSAGES[status] ?? STATUS_MESSAGES.in_review;
  const subject = `${instituteName}: ${copy.subject}`;
  const text = [
    `Hello ${applicantName},`,
    '',
    copy.body,
    '',
    `Service: ${serviceName}`,
    `Option: ${offeringName}`,
    `Status: ${status.replace('_', ' ')}`,
    '',
    `View details: ${studentPortalUrl}/services`,
    '',
    `— ${instituteName}`,
  ].join('\n');

  return {
    subject,
    text,
    html: buildHtmlEmail({
      headline: copy.headline,
      intro: `Hello ${applicantName},`,
      body: `${copy.body}<br/><br/>Service: <strong>${serviceName}</strong><br/>Option: <strong>${offeringName}</strong>`,
      ctaLabel: 'Open student portal',
      ctaUrl: `${studentPortalUrl}/services`,
      instituteName,
    }),
  };
}

/**
 * @param {{ staffName: string, applicantName: string, serviceName: string, offeringName: string, instituteName: string, adminPortalUrl: string, applicationId: string }} params
 */
export function buildAssignmentEmail(params) {
  const {
    staffName,
    applicantName,
    serviceName,
    offeringName,
    instituteName,
    adminPortalUrl,
    applicationId,
  } = params;
  const reviewUrl = `${adminPortalUrl}/staff/applications/${applicationId}`;
  const subject = `${instituteName}: New request assigned to you`;
  const text = [
    `Hello ${staffName},`,
    '',
    `A service request from ${applicantName} has been assigned to you.`,
    '',
    `Service: ${serviceName}`,
    `Option: ${offeringName}`,
    '',
    `Review it here: ${reviewUrl}`,
    '',
    `— ${instituteName}`,
  ].join('\n');

  return {
    subject,
    text,
    html: buildHtmlEmail({
      headline: 'A request was assigned to you',
      intro: `Hello ${staffName},`,
      body: `Please review the request from <strong>${applicantName}</strong> for <strong>${offeringName}</strong> under <strong>${serviceName}</strong>.`,
      ctaLabel: 'Open assigned request',
      ctaUrl: reviewUrl,
      instituteName,
    }),
  };
}

export async function notifyApplicationSubmitted(application, context) {
  const email = buildSubmittedEmail({
    applicantName: application.applicantName,
    serviceName: context.serviceName,
    offeringName: context.offeringName,
    instituteName: context.instituteName,
    studentPortalUrl: env.STUDENT_CLIENT_URL,
  });

  return queueEmailNotification({
    to: application.applicantEmail,
    type: 'application-submitted',
    ...email,
  });
}

export async function notifyApplicationStatusChange(application, context, status) {
  const email = buildStatusUpdateEmail({
    applicantName: application.applicantName,
    status,
    serviceName: context.serviceName,
    offeringName: context.offeringName,
    instituteName: context.instituteName,
    studentPortalUrl: env.STUDENT_CLIENT_URL,
  });

  return queueEmailNotification({
    to: application.applicantEmail,
    type: 'application-status-change',
    ...email,
  });
}

export async function notifyApplicationAssigned(application, context, staff) {
  const email = buildAssignmentEmail({
    staffName: staff.name,
    applicantName: application.applicantName,
    serviceName: context.serviceName,
    offeringName: context.offeringName,
    instituteName: context.instituteName,
    adminPortalUrl: env.ADMIN_CLIENT_URL,
    applicationId: application._id.toString(),
  });

  return queueEmailNotification({
    to: staff.email,
    type: 'application-assigned',
    ...email,
  });
}

/**
 * @param {{ applicantName: string, serviceName: string, offeringName: string, instituteName: string }} params
 */
export function buildIntakeReceivedEmail(params) {
  const { applicantName, serviceName, offeringName, instituteName } = params;
  const copy = STATUS_MESSAGES.pending_authorization;
  const subject = `${instituteName}: ${copy.subject}`;
  const text = [
    `Hello ${applicantName},`,
    '',
    copy.body,
    '',
    `Programme: ${offeringName}`,
    `Service: ${serviceName}`,
    '',
    `— ${instituteName}`,
  ].join('\n');

  return {
    subject,
    text,
    html: buildHtmlEmail({
      headline: copy.headline,
      intro: `Hello ${applicantName},`,
      body: `${copy.body}<br/><br/>Programme: <strong>${offeringName}</strong>`,
      ctaLabel: null,
      ctaUrl: null,
      instituteName,
    }),
  };
}

/**
 * @param {{ applicantName: string, serviceName: string, offeringName: string, instituteName: string, studentPortalUrl: string, email: string, temporaryPassword?: string }} params
 */
export function buildIntakeApprovedEmail(params) {
  const {
    applicantName,
    serviceName,
    offeringName,
    instituteName,
    studentPortalUrl,
    email,
    temporaryPassword,
  } = params;
  const subject = `${instituteName}: You may start your enrollment application`;
  const credentialLines = temporaryPassword
    ? [
        '',
        'Use these login details to access the student portal:',
        `Email: ${email}`,
        `Temporary password: ${temporaryPassword}`,
        'You will be asked to change your password on first login.',
      ]
    : [
        '',
        `Sign in with your existing account (${email}) to continue your enrollment application.`,
      ];

  const text = [
    `Hello ${applicantName},`,
    '',
    `Your institute authorized you to start the application for ${offeringName} under ${serviceName}.`,
    ...credentialLines,
    '',
    `Student portal: ${studentPortalUrl}/login`,
    '',
    `— ${instituteName}`,
  ].join('\n');

  const bodyHtml = temporaryPassword
    ? `Your institute authorized you to start the application for <strong>${offeringName}</strong>.<br/><br/>Login email: <strong>${email}</strong><br/>Temporary password: <strong>${temporaryPassword}</strong><br/>You will be asked to change your password on first login.`
    : `Your institute authorized you to start the application for <strong>${offeringName}</strong>. Sign in with your existing account to continue.`;

  return {
    subject,
    text,
    html: buildHtmlEmail({
      headline: 'Authorization approved',
      intro: `Hello ${applicantName},`,
      body: bodyHtml,
      ctaLabel: 'Open student portal',
      ctaUrl: `${studentPortalUrl}/login`,
      instituteName,
    }),
  };
}

export async function notifyEnrollmentIntakeReceived(application, context) {
  const email = buildIntakeReceivedEmail({
    applicantName: application.applicantName,
    serviceName: context.serviceName,
    offeringName: context.offeringName,
    instituteName: context.instituteName,
  });

  return queueEmailNotification({
    to: application.applicantEmail,
    type: 'enrollment-intake-received',
    ...email,
  });
}

export async function notifyEnrollmentIntakeApproved(application, context, credentials = {}) {
  const email = buildIntakeApprovedEmail({
    applicantName: application.applicantName,
    serviceName: context.serviceName,
    offeringName: context.offeringName,
    instituteName: context.instituteName,
    studentPortalUrl: env.STUDENT_CLIENT_URL,
    email: application.applicantEmail,
    temporaryPassword: credentials.temporaryPassword,
  });

  return queueEmailNotification({
    to: application.applicantEmail,
    type: 'enrollment-intake-approved',
    ...email,
  });
}
