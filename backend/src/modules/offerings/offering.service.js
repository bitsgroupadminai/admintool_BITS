import { Offering } from './offering.model.js';
import { Service } from '../services/service.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import {
  deriveOfferingStatus,
  getOfferingCompleteness,
  resolveOfferingDisplayStatus,
} from '../../shared/helpers/offeringCompleteness.helper.js';
import {
  normalizeWorkflowSteps,
  validateWorkflowSteps,
} from '../../shared/helpers/workflow.helper.js';
import { syncServiceActiveStatus } from '../services/service.service.js';
import { enqueueServiceReindex } from '../../core/queues/embedding.queue.js';
import { validateOperatingHoursWindow } from '../../shared/helpers/operatingHours.helper.js';
import { ensureUniqueApplicantFieldKeys } from '../../shared/helpers/applicantFields.helper.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import {
  flushInstituteReadCache,
  flushStudentInstitutesCache,
} from '../../shared/helpers/cacheInvalidation.helper.js';
import { isWithinOfferingDates } from '../../shared/helpers/offeringDates.helper.js';
import {
  documentHasEligibilityCriteria,
  flattenDocumentEligibility,
  normalizeDocumentEligibility,
} from '../../shared/helpers/documentEligibility.helper.js';

async function flushOfferingCaches(instituteId) {
  await flushInstituteReadCache(instituteId);
  await flushStudentInstitutesCache();
}

async function scheduleOfferingReindex(offering) {
  await enqueueServiceReindex(
    offering.instituteId.toString(),
    offering.serviceId.toString(),
    'offering-update',
  );
}

function applyPaymentConfig(offering, paymentConfig) {
  if (!paymentConfig?.enabled) {
    offering.paymentConfig = { enabled: false };
  } else {
    offering.paymentConfig = {
      enabled: true,
      amount: paymentConfig.amount,
      currency: paymentConfig.currency ?? 'INR',
      label: paymentConfig.label?.trim() || 'Service fee',
      timing: paymentConfig.timing ?? 'before_submit',
      workflowStepId:
        paymentConfig.timing === 'workflow_step'
          ? paymentConfig.workflowStepId?.trim() || undefined
          : undefined,
    };
  }
  offering.markModified('paymentConfig');
}

/**
 * @param {import('./offering.model.js').Offering} doc
 */
function formatOffering(doc) {
  const completeness = getOfferingCompleteness(doc);
  const isActive = doc.status === OFFERING_STATUS.ACTIVE;
  const inWindow = isWithinOfferingDates(doc);
  let studentPortalNote = null;
  if (isActive && !inWindow && doc.startDate && new Date(doc.startDate) > new Date()) {
    studentPortalNote = `Scheduled — visible on the student portal from ${new Date(doc.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
  } else if (isActive && !inWindow) {
    studentPortalNote = 'Intake dates have ended — not visible on the student portal until dates are updated';
  } else if (isActive) {
    studentPortalNote = 'Visible on the student portal';
  }

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
    studentPortalVisible: isActive && inWindow,
    studentPortalNote,
    configurationVersion: doc.configurationVersion,
    eligibilityRules: doc.eligibilityRules ?? [],
    documentRequirements: doc.documentRequirements ?? [],
    workflowSteps: doc.workflowSteps ?? [],
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
async function loadOfferingsList(instituteId, serviceId) {
  const filter = { instituteId };
  if (serviceId) filter.serviceId = serviceId;

  const offerings = await Offering.find(filter).sort({ createdAt: -1 });
  return offerings.map(formatOffering);
}

/**
 * @param {string} instituteId
 * @param {string} [serviceId]
 */
export async function listOfferings(instituteId, serviceId) {
  return cachedRead(cacheNs.OFFERINGS_LIST, [instituteId, serviceId ?? 'all'], () =>
    loadOfferingsList(instituteId, serviceId),
  );
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

  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function getOfferingById(offeringId, instituteId) {
  return cachedRead(cacheNs.OFFERING_DETAIL, [instituteId, offeringId], async () =>
    formatOffering(await getOfferingDoc(offeringId, instituteId)),
  );
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} payload
 */
export async function updateOffering(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  if (payload.name) offering.name = payload.name.trim();
  if (payload.description !== undefined) {
    offering.description = payload.description?.trim() || '';
  }
  if (payload.visitLocation !== undefined) {
    offering.visitLocation = payload.visitLocation?.trim() || '';
  }
  if (payload.visitInstructions !== undefined) {
    offering.visitInstructions = payload.visitInstructions?.trim() || '';
  }
  if (payload.startDate !== undefined) {
    offering.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }
  if (payload.endDate !== undefined) {
    offering.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }
  if (payload.status) offering.status = payload.status;

  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} payload
 */
export async function updateOfferingDetails(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  if (payload.name) offering.name = payload.name.trim();
  if (payload.description !== undefined) {
    offering.description = payload.description?.trim() || '';
  }
  if (payload.visitLocation !== undefined) {
    offering.visitLocation = payload.visitLocation?.trim() || '';
  }
  if (payload.visitInstructions !== undefined) {
    offering.visitInstructions = payload.visitInstructions?.trim() || '';
  }
  if (payload.startDate !== undefined) {
    offering.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }
  if (payload.endDate !== undefined) {
    offering.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }
  if (payload.applicantFields !== undefined) {
    const labels = payload.applicantFields.map((field) => field.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      throw new AppError('Duplicate applicant field labels are not allowed', 400);
    }
    offering.applicantFields = ensureUniqueApplicantFieldKeys(payload.applicantFields);
  }
  if (payload.intakeDocument !== undefined) {
    const label = payload.intakeDocument?.label?.trim() ?? '';
    if (!label) {
      offering.intakeDocument = undefined;
    } else {
      if (!offering.intakeDocument) {
        offering.intakeDocument = {};
      }
      offering.intakeDocument.label = label;
      offering.intakeDocument.helpText = payload.intakeDocument.helpText?.trim() ?? '';
      offering.intakeDocument.required = payload.intakeDocument.required !== false;
      offering.intakeDocument.allowedTypes = payload.intakeDocument.allowedTypes?.length
        ? payload.intakeDocument.allowedTypes
        : ['pdf'];
      offering.intakeDocument.maxSizeMb = payload.intakeDocument.maxSizeMb ?? 5;
      offering.markModified('intakeDocument');
    }
  }
  if (payload.paymentConfig !== undefined) {
    applyPaymentConfig(offering, payload.paymentConfig);
  }

  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} paymentConfig
 */
export async function updateOfferingPayment(offeringId, instituteId, paymentConfig) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  applyPaymentConfig(offering, paymentConfig);
  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
  return formatOffering(offering);
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function updateEligibilityRules(offeringId, instituteId, payload) {
  const offering = await getOfferingDoc(offeringId, instituteId);

  if (payload.documents?.length) {
    const eligibilityByName = new Map(
      payload.documents.map((item) => [item.name.trim().toLowerCase(), item.eligibility]),
    );
    const nextRequirements = (offering.documentRequirements ?? []).map((requirement) => {
      const eligibility = eligibilityByName.get(requirement.name.trim().toLowerCase());
      if (!eligibility) return requirement;
      requirement.eligibility = normalizeDocumentEligibility(eligibility);
      return requirement;
    });
    const unmatched = payload.documents.filter(
      (item) =>
        !offering.documentRequirements?.some(
          (requirement) => requirement.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
        ),
    );
    if (unmatched.length) {
      throw new AppError(
        `Eligibility was set for documents that are not in this offering: ${unmatched
          .map((item) => item.name)
          .join(', ')}`,
        400,
      );
    }
    const incomplete = nextRequirements.filter(
      (requirement) =>
        requirement.eligibility?.enabled && !documentHasEligibilityCriteria(requirement.eligibility),
    );
    if (incomplete.length) {
      throw new AppError(
        `Add at least one criterion for: ${incomplete
          .map((requirement) => requirement.name)
          .join(', ')} — or turn eligibility off for that document`,
        400,
      );
    }
    offering.documentRequirements = nextRequirements;
    offering.markModified('documentRequirements');
    offering.eligibilityRules = flattenDocumentEligibility(nextRequirements);
  } else if (payload.rules?.length) {
    offering.eligibilityRules = payload.rules;
  }

  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
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
  offering.documentRequirements = requirements.map((requirement) => ({
    ...requirement,
    eligibility: requirement.eligibility
      ? normalizeDocumentEligibility(requirement.eligibility)
      : requirement.eligibility,
  }));
  const flattened = flattenDocumentEligibility(offering.documentRequirements);
  if (flattened.length) {
    offering.eligibilityRules = flattened;
  }
  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
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
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
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

  if (payload.appointmentConfig) {
    const hours = validateOperatingHoursWindow(
      payload.appointmentConfig.operatingHoursStart,
      payload.appointmentConfig.operatingHoursEnd,
    );
    offering.appointmentConfig = {
      ...payload.appointmentConfig,
      operatingHoursStart: hours.start ?? payload.appointmentConfig.operatingHoursStart,
      operatingHoursEnd: hours.end ?? payload.appointmentConfig.operatingHoursEnd,
    };
  } else {
    offering.appointmentConfig = undefined;
  }

  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
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
  await scheduleOfferingReindex(offering);
  await flushOfferingCaches(instituteId);
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
  await flushOfferingCaches(instituteId);
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

  await flushOfferingCaches(instituteId);
  return { results };
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function deleteOffering(offeringId, instituteId) {
  const offering = await getOfferingDoc(offeringId, instituteId);
  const requestCount = await Application.countDocuments({ offeringId: offering._id });
  if (requestCount > 0) {
    throw new AppError(
      'This service option cannot be deleted because students have already submitted requests for it',
      400,
    );
  }
  const serviceId = offering.serviceId.toString();
  await Offering.deleteOne({ _id: offeringId });
  await syncServiceActiveStatus(serviceId, instituteId);
  await flushOfferingCaches(instituteId);
  return { id: offeringId };
}
