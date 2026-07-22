import crypto from 'crypto';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Institute } from '../institutes/institute.model.js';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';
import { OFFERING_STATUS, QUEUE_MODE, RULE_FIELD_TYPE, RULE_OPERATOR } from '../../shared/enums/offering.enums.js';
import { HANDLER_TYPE } from '../../shared/enums/workflow.enums.js';
import { SYSTEM_SERVICE_KEYS } from '../../shared/constants/systemServices.js';
import {
  buildCanonicalAdmissionSkeleton,
  buildCanonicalAdmissionStepOutcomes,
} from '../../shared/helpers/admission-workflow.helper.js';
import { validateWorkflowSteps } from '../../shared/helpers/workflow.helper.js';
import { deriveOfferingStatus } from '../../shared/helpers/offeringCompleteness.helper.js';
import { logger } from '../../core/logger/index.js';

const DEFAULT_DOCUMENTS = [
  { name: 'Class 10 marksheet', required: true, allowedTypes: ['pdf'], maxSizeMb: 5 },
  { name: 'Class 12 marksheet', required: true, allowedTypes: ['pdf'], maxSizeMb: 5 },
  { name: 'Entrance exam scorecard', required: true, allowedTypes: ['pdf'], maxSizeMb: 5 },
  { name: 'Government-issued ID proof', required: true, allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMb: 5 },
  { name: 'Passport-size photograph', required: true, allowedTypes: ['jpg', 'jpeg', 'png'], maxSizeMb: 2 },
  { name: 'Signature image', required: true, allowedTypes: ['jpg', 'jpeg', 'png'], maxSizeMb: 2 },
];

const UG_ELIGIBILITY = [
  { field: 'Qualification', fieldType: RULE_FIELD_TYPE.TEXT, operator: RULE_OPERATOR.EQ, value: '10+2 or equivalent' },
  { field: 'PCM Aggregate', fieldType: RULE_FIELD_TYPE.NUMERIC, operator: RULE_OPERATOR.GTE, value: 75 },
  { field: 'Physics', fieldType: RULE_FIELD_TYPE.NUMERIC, operator: RULE_OPERATOR.GTE, value: 60 },
  { field: 'Chemistry', fieldType: RULE_FIELD_TYPE.NUMERIC, operator: RULE_OPERATOR.GTE, value: 60 },
  { field: 'Mathematics', fieldType: RULE_FIELD_TYPE.NUMERIC, operator: RULE_OPERATOR.GTE, value: 60 },
];

const PG_ELIGIBILITY = [
  { field: 'Qualification', fieldType: RULE_FIELD_TYPE.TEXT, operator: RULE_OPERATOR.EQ, value: "Bachelor's degree or equivalent" },
  { field: 'Minimum Aggregate', fieldType: RULE_FIELD_TYPE.NUMERIC, operator: RULE_OPERATOR.GTE, value: 60 },
];

const PROGRAMME_TEMPLATES = [
  {
    name: 'B.E. Computer Science (UG-CS)',
    description:
      'Four-year undergraduate engineering programme focused on software systems, algorithms, AI/ML fundamentals, and distributed systems.',
    eligibilityRules: UG_ELIGIBILITY,
    documentRequirements: DEFAULT_DOCUMENTS,
  },
  {
    name: 'B.E. Electrical Engineering (UG-EE)',
    description:
      'Four-year undergraduate engineering programme in electrical systems, power engineering, and embedded design.',
    eligibilityRules: UG_ELIGIBILITY,
    documentRequirements: DEFAULT_DOCUMENTS,
  },
  {
    name: 'M.Sc. Data Science (PG-DS)',
    description:
      'Two-year postgraduate programme covering statistics, machine learning, and data engineering.',
    eligibilityRules: PG_ELIGIBILITY,
    documentRequirements: DEFAULT_DOCUMENTS.filter((d) => d.name !== 'Entrance exam scorecard'),
  },
];

/**
 * @param {string[]} documentNames
 */
function buildAdmissionWorkflow(documentNames) {
  const skeleton = buildCanonicalAdmissionSkeleton(documentNames);
  const outcomeDefs = buildCanonicalAdmissionStepOutcomes(documentNames);
  const stepIds = skeleton.map(() => crypto.randomUUID());
  const orderToId = new Map(skeleton.map((s, i) => [s.order, stepIds[i]]));

  const steps = skeleton.map((sk, i) => {
    const rawOutcomes = outcomeDefs.find((o) => o.order === sk.order)?.outcomes ?? [];
    const outcomes = rawOutcomes.map((outcome) => {
      const route = { ...outcome.route };
      if (route.nextStepOrder) {
        route.nextStepId = orderToId.get(route.nextStepOrder);
        delete route.nextStepOrder;
      }
      if (route.returnToStepOrder !== undefined) {
        route.returnToStepId =
          route.returnToStepOrder === null ? null : orderToId.get(route.returnToStepOrder);
        delete route.returnToStepOrder;
      }
      return { type: outcome.type, route };
    });

    let handledByType = HANDLER_TYPE.STAFF;
    if (sk.handledByType === 'ai') handledByType = HANDLER_TYPE.AI;
    if (sk.handledByType === 'student') handledByType = HANDLER_TYPE.STUDENT;

    return {
      stepId: stepIds[i],
      order: sk.order,
      name: sk.name,
      description: sk.description,
      handledBy: {
        type: handledByType,
        assignee: sk.handledByAssignee,
      },
      slaValue: sk.slaValue,
      slaUnit: sk.slaUnit,
      outcomes,
    };
  });

  return validateWorkflowSteps(steps);
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {typeof PROGRAMME_TEMPLATES[number]} template
 */
async function createProgrammeOffering(instituteId, serviceId, template) {
  const existing = await Offering.findOne({
    instituteId,
    serviceId,
    name: template.name,
  });
  if (existing) {
    if (!existing.description && template.description) {
      existing.description = template.description;
      await existing.save();
    }
    return existing;
  }

  const documentNames = template.documentRequirements.map((d) => d.name);
  const workflowSteps = buildAdmissionWorkflow(documentNames);

  const offering = await Offering.create({
    instituteId,
    serviceId,
    name: template.name,
    description: template.description,
    eligibilityRules: template.eligibilityRules,
    documentRequirements: template.documentRequirements,
    workflowSteps,
    queueMode: QUEUE_MODE.QUEUE_ONLY,
    queueConfig: { capacity: 500, processingRatePerHour: 40 },
    status: OFFERING_STATUS.ACTIVE,
    activatedAt: new Date(),
    configurationVersion: 1,
  });

  offering.status = deriveOfferingStatus(offering);
  await offering.save();
  return offering;
}

/**
 * @param {string} instituteId
 */
export async function ensureEnrollmentServiceForInstitute(instituteId) {
  let service = await Service.findOne({
    instituteId,
    systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
  });

  if (!service) {
    service = await Service.create({
      instituteId,
      name: 'Enrollment',
      nameNormalized: 'enrollment',
      description:
        'Student enrollment and programme admission. Every institute offers this service for new student intake.',
      status: SERVICE_STATUS.ACTIVE,
      isSystem: true,
      systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
    });
    logger.info({ instituteId }, 'Created system Enrollment service');
  }

  // Do not auto-seed demo programmes (B.E. CS / EE / M.Sc.).
  // Institutes configure real offerings under Admission (or Enrollment) from knowledge docs.
  return service;
}

/**
 * Ensures all setup-complete institutes have the Enrollment service.
 */
export async function bootstrapEnrollmentServices() {
  const institutes = await Institute.find({ setupCompleted: true });
  for (const institute of institutes) {
    await ensureEnrollmentServiceForInstitute(institute._id.toString());
  }
}
