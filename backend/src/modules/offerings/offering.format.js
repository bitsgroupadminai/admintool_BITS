import {
  getOfferingCompleteness,
  resolveOfferingDisplayStatus,
} from '../../shared/helpers/offeringCompleteness.helper.js';
import { normalizeWorkflowSteps } from '../../shared/helpers/workflow.helper.js';

/**
 * @param {import('./offering.model.js').Offering} doc
 */
export function formatOfferingResponse(doc) {
  const completeness = getOfferingCompleteness(doc);

  return {
    id: doc._id.toString(),
    instituteId: doc.instituteId.toString(),
    serviceId: doc.serviceId.toString(),
    name: doc.name,
    description: doc.description ?? '',
    visitLocation: doc.visitLocation ?? '',
    visitInstructions: doc.visitInstructions ?? '',
    status: resolveOfferingDisplayStatus(doc),
    startDate: doc.startDate,
    endDate: doc.endDate,
    configurationVersion: doc.configurationVersion,
    eligibilityRules: doc.eligibilityRules ?? [],
    documentRequirements: doc.documentRequirements ?? [],
    workflowSteps: normalizeWorkflowSteps(doc.workflowSteps ?? []),
    queueMode: doc.queueMode ?? null,
    queueConfig: doc.queueConfig ?? null,
    appointmentConfig: doc.appointmentConfig ?? null,
    applicantFields: doc.applicantFields ?? [],
    intakeDocument: doc.intakeDocument?.label?.trim()
      ? {
          id: doc.intakeDocument._id.toString(),
          label: doc.intakeDocument.label,
          helpText: doc.intakeDocument.helpText ?? '',
          required: doc.intakeDocument.required !== false,
          allowedTypes: doc.intakeDocument.allowedTypes ?? ['pdf'],
          maxSizeMb: doc.intakeDocument.maxSizeMb ?? 5,
        }
      : null,
    paymentConfig: doc.paymentConfig?.enabled
      ? {
          enabled: true,
          amount: doc.paymentConfig.amount,
          currency: doc.paymentConfig.currency ?? 'INR',
          label: doc.paymentConfig.label ?? 'Service fee',
          timing: doc.paymentConfig.timing ?? 'before_submit',
          workflowStepId: doc.paymentConfig.workflowStepId ?? null,
        }
      : { enabled: false },
    hasAiSuggestions: Boolean(doc.aiSuggestions),
    completeness,
    activatedAt: doc.activatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
