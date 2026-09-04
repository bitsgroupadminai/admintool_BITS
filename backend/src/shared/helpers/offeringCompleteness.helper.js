import { QUEUE_MODE, OFFERING_STATUS } from '../enums/offering.enums.js';
import { normalizeWorkflowSteps } from './workflow.helper.js';
import { validateOperatingHoursWindow } from './operatingHours.helper.js';
import { offeringHasEligibilityConfigured } from './documentEligibility.helper.js';

function hasValidAppointmentConfig(config) {
  if (!config?.slotDurationMinutes) return false;
  const hours = validateOperatingHoursWindow(
    config.operatingHoursStart,
    config.operatingHoursEnd,
  );
  return hours.valid;
}

/**
 * @param {import('../../modules/offerings/offering.model.js').OfferingDocument} offering
 */
export function getOfferingCompleteness(offering) {
  const missing = [];

  if (!offeringHasEligibilityConfigured(offering)) {
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
    if (!hasValidAppointmentConfig(offering.appointmentConfig)) {
      missing.push('appointment_config');
    }
  } else if (offering.queueMode === QUEUE_MODE.HYBRID) {
    if (!offering.queueConfig?.capacity || !hasValidAppointmentConfig(offering.appointmentConfig)) {
      missing.push('hybrid_config');
    }
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

/**
 * An offering counts toward service activation when it is live or fully configured.
 * @param {import('../../modules/offerings/offering.model.js').OfferingDocument} offering
 */
export function isOfferingReadyForServiceActivation(offering) {
  if (offering.status === OFFERING_STATUS.ACTIVE) return true;
  if (
    offering.status === OFFERING_STATUS.DISABLED ||
    offering.status === OFFERING_STATUS.ARCHIVED ||
    offering.status === OFFERING_STATUS.EXPIRED
  ) {
    return false;
  }
  return getOfferingCompleteness(offering).isComplete;
}

export const OFFERING_MISSING_LABELS = {
  eligibility_rules: 'Eligibility criteria on each academic document',
  document_requirements: 'At least one required document',
  workflow: 'Workflow steps',
  sla: 'Workflow SLA on every step',
  workflow_handlers: 'Who handles each workflow step',
  workflow_outcomes: 'Outcomes on every workflow step',
  queue_mode: 'Queue mode',
  queue_config: 'Queue capacity',
  appointment_config: 'Appointment settings',
  hybrid_config: 'Queue and appointment settings',
};

/**
 * @param {string[]} missing
 */
export function formatOfferingMissing(missing) {
  return (missing ?? []).map((key) => OFFERING_MISSING_LABELS[key] ?? key.replace(/_/g, ' '));
}

/**
 * @param {import('../../modules/offerings/offering.model.js').OfferingDocument} offering
 */
export function resolveOfferingDisplayStatus(offering) {
  return deriveOfferingStatus(offering);
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
