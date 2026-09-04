export const OFFERING_MISSING_LABELS = {
  eligibility_rules: 'Eligibility criteria on each academic document',
  document_requirements: 'At least one required document',
  workflow: 'Workflow steps',
  sla: 'Workflow SLA on every step',
  workflow_handlers: 'Who handles each workflow step',
  workflow_outcomes: 'Outcomes on every workflow step',
  workflow_instructions: 'Staff, admin, and student instructions on every workflow step',
  queue_mode: 'Queue mode',
  queue_config: 'Queue capacity',
  appointment_config: 'Appointment settings',
  hybrid_config: 'Queue and appointment settings',
};

export function formatOfferingMissing(missing = []) {
  return missing.map((key) => OFFERING_MISSING_LABELS[key] ?? key.replace(/_/g, ' '));
}

const WORKFLOW_MISSING = ['workflow', 'sla', 'workflow_handlers', 'workflow_outcomes', 'workflow_instructions'];
const QUEUE_MISSING = ['queue_mode', 'queue_config', 'appointment_config', 'hybrid_config'];

export function isOfferingSectionComplete(sectionId, missing = []) {
  if (!missing.length) return true;
  if (sectionId === 'details') return true;
  if (sectionId === 'workflow') {
    return WORKFLOW_MISSING.every((key) => !missing.includes(key));
  }
  if (sectionId === 'queue') {
    return QUEUE_MISSING.every((key) => !missing.includes(key));
  }
  if (sectionId === 'payment') return true;
  const sectionKey = {
    eligibility: 'eligibility_rules',
    documents: 'document_requirements',
  }[sectionId];
  return sectionKey ? !missing.includes(sectionKey) : true;
}

export function isOfferingReadyForServiceActivation(offering) {
  if (offering.status === 'active') return true;
  if (offering.status === 'disabled' || offering.status === 'archived') return false;
  return Boolean(offering.completeness?.isComplete);
}

export function countServiceReadyOfferings(offerings = []) {
  return offerings.filter(isOfferingReadyForServiceActivation).length;
}
