import { queueEmailNotification } from '../../core/services/email.service.js';
import { buildHtmlEmail } from './emailLayout.js';
import { getStudentPortalUrl } from '../helpers/portalUrls.helper.js';
import { logger } from '../../core/logger/index.js';
import {
  buildStudentEmailVars,
  canonicalStudentEmailTemplate,
  hasStudentEmailTemplate,
  interpolateStudentEmail,
  normalizeStudentEmail,
  studentEmailBodyToHtml,
} from '../helpers/workflowStudentEmail.helper.js';

/**
 * @param {Object} step
 * @param {Object[]} [allSteps]
 * @param {Object[]} [offeringSteps]
 */
export function resolveStepStudentEmail(step, allSteps = [], offeringSteps = []) {
  if (hasStudentEmailTemplate(step)) {
    return normalizeStudentEmail(step.studentEmail);
  }
  const fromOffering = (offeringSteps ?? []).find(
    (item) =>
      item.stepId === step?.stepId ||
      (Number(item.order) === Number(step?.order) && item.name === step?.name),
  );
  if (hasStudentEmailTemplate(fromOffering)) {
    return normalizeStudentEmail(fromOffering.studentEmail);
  }
  const sorted = [...allSteps].sort((a, b) => Number(a.order) - Number(b.order));
  const index = sorted.findIndex((item) => item.stepId === step?.stepId);
  const nextStepName = index >= 0 ? sorted[index + 1]?.name : undefined;
  return canonicalStudentEmailTemplate(step, { nextStepName });
}

/**
 * @param {{
 *   application: object,
 *   step: object,
 *   steps?: object[],
 *   context?: object,
 *   offering?: object,
 * }} params
 */
export function buildWorkflowStepEmail({
  application,
  step,
  steps = [],
  context = {},
  offering = {},
}) {
  const template = resolveStepStudentEmail(step, steps, offering.workflowSteps ?? []);
  const vars = buildStudentEmailVars(
    application,
    {
      ...context,
      studentPortalUrl: context.studentPortalUrl || getStudentPortalUrl(),
    },
    offering,
  );
  const subject = interpolateStudentEmail(template.subject, vars);
  const headline = interpolateStudentEmail(
    template.headline || 'An update on your request',
    vars,
  );
  const bodyText = interpolateStudentEmail(template.body, vars);
  const intro = `Hello ${vars.applicantName},`;
  const bodyWithoutIntro = bodyText.replace(
    new RegExp(`^Hello\\s+${vars.applicantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,\\s]*`, 'i'),
    '',
  );

  return {
    subject,
    text: `${bodyText}\n\n— ${vars.instituteName}`,
    html: buildHtmlEmail({
      headline,
      intro,
      body: studentEmailBodyToHtml(bodyWithoutIntro.trim()),
      ctaLabel: 'Open your dashboard',
      ctaUrl: vars.dashboardUrl,
      instituteName: vars.instituteName,
    }),
    dashboardUrl: vars.dashboardUrl,
  };
}

/**
 * Email the student when a workflow step is completed (for example Offer Release).
 * @returns {Promise<boolean>}
 */
export async function notifyWorkflowStepCompleted({
  application,
  step,
  steps = [],
  context = {},
  offering = {},
}) {
  if (!application?.applicantEmail || !step) return false;

  const email = buildWorkflowStepEmail({
    application,
    step,
    steps,
    context,
    offering,
  });

  try {
    await queueEmailNotification({
      to: application.applicantEmail,
      type: 'workflow-step-complete',
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return true;
  } catch (err) {
    logger.error(
      {
        err,
        to: application.applicantEmail,
        applicationId: application._id,
        stepId: step.stepId,
        stepName: step.name,
      },
      'Failed to queue workflow step email',
    );
    return false;
  }
}
