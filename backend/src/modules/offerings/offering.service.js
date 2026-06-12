import { Offering } from './offering.model.js';
import { Service } from '../services/service.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import {
  deriveOfferingStatus,
  getOfferingCompleteness,
} from '../../shared/helpers/offeringCompleteness.helper.js';
import {
  normalizeWorkflowSteps,
  validateWorkflowSteps,
} from '../../shared/helpers/workflow.helper.js';
import { syncServiceActiveStatus } from '../services/service.service.js';

/**
 * @param {import('./offering.model.js').Offering} doc
 */
function formatOffering(doc) {
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
    workflowSteps: doc.workflowSteps ?? [],
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

async function getOfferingDoc(offeringId, instituteId) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }
  return offering;
}

/**
 * @param {string} instituteId
 * @param {string} [serviceId]
 */
export async function listOfferings(instituteId, serviceId) {
  const filter = { instituteId };
  if (serviceId) filter.serviceId = serviceId;

  const offerings = await Offering.find(filter).sort({ createdAt: -1 });
  return offerings.map(formatOffering);
}

/**
 * @param {string} instituteId
 * @param {{ name: string, serviceId: string }} payload
 */
export async function createOffering(instituteId, payload) {
  const service = await Service.findOne({ _id: payload.serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const offering = await Offering.create({
    instituteId,
    serviceId: payload.serviceId,
    name: payload.name.trim(),
    status: OFFERING_STATUS.DRAFT,
  });

  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function getOfferingById(offeringId, instituteId) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} payload
 */
export async function updateOffering(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  if (payload.name) offering.name = payload.name.trim();
  if (payload.startDate !== undefined) {
    offering.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }
  if (payload.endDate !== undefined) {
    offering.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }
  if (payload.status) offering.status = payload.status;

  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateEligibilityRules(offeringId, instituteId, rules) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  offering.eligibilityRules = rules;
  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateDocumentRequirements(offeringId, instituteId, requirements) {
  const names = requirements.map((r) => r.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    throw new AppError('Duplicate document names are not allowed', 400);
  }

  const offering = await getOfferingDoc(offeringId, instituteId);
  offering.documentRequirements = requirements;
  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateWorkflow(offeringId, instituteId, steps) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  offering.workflowSteps = validateWorkflowSteps(steps);
  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateQueueConfig(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  offering.queueMode = payload.queueMode;
  offering.queueConfig = payload.queueConfig ?? undefined;
  offering.appointmentConfig = payload.appointmentConfig ?? undefined;
  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function activateOffering(offeringId, instituteId) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  const completeness = getOfferingCompleteness(offering);

  if (!completeness.isComplete) {
    throw new AppError('Offering configuration is incomplete', 400, [
      { missing: completeness.missing },
    ]);
  }

  if (offering.endDate && offering.endDate < new Date()) {
    throw new AppError('Cannot activate an expired offering', 400);
  }

  offering.status = OFFERING_STATUS.ACTIVE;
  offering.activatedAt = new Date();
  await offering.save();
  await syncServiceActiveStatus(offering.serviceId.toString(), instituteId);
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function duplicateOffering(offeringId, instituteId) {
  const source = await getOfferingDoc(offeringId, instituteId);
  const copy = await Offering.create({
    instituteId,
    serviceId: source.serviceId,
    name: `${source.name} (Copy)`,
    status: OFFERING_STATUS.INCOMPLETE,
    eligibilityRules: source.eligibilityRules,
    documentRequirements: source.documentRequirements,
    workflowSteps: normalizeWorkflowSteps(source.workflowSteps ?? []),
    queueMode: source.queueMode,
    queueConfig: source.queueConfig,
    appointmentConfig: source.appointmentConfig,
    configurationVersion: 1,
  });

  copy.status = deriveOfferingStatus(copy);
  await copy.save();
  return formatOffering(copy);
}

/**
 * @param {string} instituteId
 * @param {{ offeringIds: string[], action: string }} payload
 */
export async function bulkOfferingAction(instituteId, payload) {
  const statusMap = {
    enable: OFFERING_STATUS.ACTIVE,
    disable: OFFERING_STATUS.DISABLED,
    archive: OFFERING_STATUS.ARCHIVED,
  };

  const targetStatus = statusMap[payload.action];
  const results = [];

  for (const id of payload.offeringIds) {
    const offering = await Offering.findOne({ _id: id, instituteId });
    if (!offering) continue;

    if (payload.action === 'enable') {
      const completeness = getOfferingCompleteness(offering);
      if (!completeness.isComplete) {
        results.push({ id, success: false, message: 'Configuration incomplete' });
        continue;
      }
      offering.status = OFFERING_STATUS.ACTIVE;
      offering.activatedAt = new Date();
    } else {
      offering.status = targetStatus;
    }

    await offering.save();
    await syncServiceActiveStatus(offering.serviceId.toString(), instituteId);
    results.push({ id, success: true });
  }

  return { results };
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function deleteOffering(offeringId, instituteId) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  const serviceId = offering.serviceId.toString();
  await Offering.deleteOne({ _id: offeringId });
  await syncServiceActiveStatus(serviceId, instituteId);
  return { id: offeringId };
}
