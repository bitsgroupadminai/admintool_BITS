import {
  deriveOfferingStatus,
  getOfferingCompleteness,
} from '../../shared/helpers/offeringCompleteness.helper.js';
import { normalizeWorkflowSteps } from '../../shared/helpers/workflow.helper.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';

/**
 * @param {import('./offering.model.js').Offering} doc
 */
export function formatOfferingResponse(doc) {
  const completeness = getOfferingCompleteness(doc);
  const derivedStatus = deriveOfferingStatus(doc);

  return {
    id: doc._id.toString(),
    instituteId: doc.instituteId.toString(),
    serviceId: doc.serviceId.toString(),
    name: doc.name,
    status: doc.status === OFFERING_STATUS.DRAFT ? derivedStatus : doc.status,
    startDate: doc.startDate,
    endDate: doc.endDate,
    configurationVersion: doc.configurationVersion,
    eligibilityRules: doc.eligibilityRules ?? [],
    documentRequirements: doc.documentRequirements ?? [],
    workflowSteps: normalizeWorkflowSteps(doc.workflowSteps ?? []),
    queueMode: doc.queueMode ?? null,
    queueConfig: doc.queueConfig ?? null,
    appointmentConfig: doc.appointmentConfig ?? null,
    hasAiSuggestions: Boolean(doc.aiSuggestions),
    completeness,
    activatedAt: doc.activatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
