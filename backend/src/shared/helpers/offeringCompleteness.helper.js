import { QUEUE_MODE } from '../enums/offering.enums.js';
import { normalizeWorkflowSteps } from './workflow.helper.js';

/**
 * @param {import('../../modules/offerings/offering.model.js').OfferingDocument} offering
 */
export function getOfferingCompleteness(offering) {
  const missing = [];

  if (!offering.eligibilityRules?.length) {
    missing.push('eligibility_rules');
  }

  const hasRequiredDoc = offering.documentRequirements?.some((d) => d.required);
  if (!hasRequiredDoc) {
    missing.push('document_requirements');
  }

  const workflowSteps = normalizeWorkflowSteps(offering.workflowSteps);
  if (!workflowSteps.length) {
    missing.push('workflow');
  } else {
    const invalidSla = workflowSteps.some(
      (step) => !step.slaValue || step.slaValue <= 0 || !step.slaUnit,
    );
    if (invalidSla) missing.push('sla');

    const invalidHandler = workflowSteps.some(
      (step) => !step.handledBy?.type || !step.handledBy?.assignee,
    );
    if (invalidHandler) missing.push('workflow_handlers');

    const invalidOutcomes = workflowSteps.some(
      (step) => !step.outcomes?.length,
    );
    if (invalidOutcomes) missing.push('workflow_outcomes');
  }

  if (!offering.queueMode) {
    missing.push('queue_mode');
  } else if (offering.queueMode === QUEUE_MODE.QUEUE_ONLY) {
    if (!offering.queueConfig?.capacity) missing.push('queue_config');
  } else if (offering.queueMode === QUEUE_MODE.APPOINTMENT_ONLY) {
    if (!offering.appointmentConfig?.slotDurationMinutes) missing.push('appointment_config');
  } else if (offering.queueMode === QUEUE_MODE.HYBRID) {
    if (!offering.queueConfig?.capacity || !offering.appointmentConfig?.slotDurationMinutes) {
      missing.push('hybrid_config');
    }
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

/**
 * @param {import('../../modules/offerings/offering.model.js').OfferingDocument} offering
 */
export function deriveOfferingStatus(offering) {
  if (offering.status === 'active' || offering.status === 'disabled') {
    return offering.status;
  }
  if (offering.status === 'archived' || offering.status === 'expired') {
    return offering.status;
  }

  const { isComplete } = getOfferingCompleteness(offering);
  if (isComplete) return 'complete';
  if (offering.name && offering.serviceId) return 'incomplete';
  return 'draft';
}
