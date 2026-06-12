import { z } from 'zod';
import {
  QUEUE_MODE,
  RULE_FIELD_TYPE,
  RULE_OPERATOR,
  SLA_UNIT,
  DOCUMENT_FILE_TYPES,
  OFFERING_STATUS,
} from '../../shared/enums/offering.enums.js';
import {
  HANDLER_TYPE,
  AI_HANDLER,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from '../../shared/enums/workflow.enums.js';

const eligibilityRuleSchema = z.object({
  field: z.string().min(1).max(100),
  fieldType: z.enum([
    RULE_FIELD_TYPE.NUMERIC,
    RULE_FIELD_TYPE.TEXT,
    RULE_FIELD_TYPE.BOOLEAN,
  ]),
  operator: z.enum(Object.values(RULE_OPERATOR)),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const documentRequirementSchema = z.object({
  name: z.string().min(1).max(120),
  required: z.boolean(),
  allowedTypes: z.array(z.enum(DOCUMENT_FILE_TYPES)).min(1),
  maxSizeMb: z.number().min(1).max(25),
});

const outcomeRouteSchema = z.object({
  action: z.enum(Object.values(ROUTE_ACTION)),
  nextStepId: z.string().optional(),
  terminalState: z.enum(Object.values(TERMINAL_STATE)).optional(),
  returnToStepId: z.string().optional(),
  requireReupload: z.array(z.string()).optional(),
});

const stepOutcomeSchema = z.object({
  type: z.enum(Object.values(OUTCOME_TYPE)),
  route: outcomeRouteSchema,
});

const workflowStepSchema = z.object({
  stepId: z.string().min(1),
  order: z.number().int().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  handledBy: z.object({
    type: z.enum(Object.values(HANDLER_TYPE)),
    assignee: z.string().min(1).max(80),
  }),
  slaValue: z.number().int().min(1),
  slaUnit: z.enum([SLA_UNIT.MINUTES, SLA_UNIT.HOURS, SLA_UNIT.DAYS]),
  outcomes: z.array(stepOutcomeSchema).min(1).max(3),
});

const queueConfigSchema = z.object({
  capacity: z.number().int().min(1),
  processingRatePerHour: z.number().int().min(1).optional(),
});

const appointmentConfigSchema = z.object({
  slotDurationMinutes: z.number().int().min(5),
  slotCapacity: z.number().int().min(1).optional(),
  operatingHoursStart: z.string().min(1),
  operatingHoursEnd: z.string().min(1),
});

export const createOfferingSchema = z.object({
  name: z.string().min(2).max(200),
  serviceId: z.string().min(1),
});

export const updateOfferingSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z
    .enum([
      OFFERING_STATUS.DRAFT,
      OFFERING_STATUS.DISABLED,
      OFFERING_STATUS.ARCHIVED,
    ])
    .optional(),
});

export const updateEligibilitySchema = z.object({
  rules: z.array(eligibilityRuleSchema).min(1),
});

export const updateDocumentsSchema = z.object({
  requirements: z.array(documentRequirementSchema).min(1),
});

export const updateWorkflowSchema = z.object({
  steps: z.array(workflowStepSchema).min(1),
});

export const updateQueueSchema = z.object({
  queueMode: z.enum([
    QUEUE_MODE.QUEUE_ONLY,
    QUEUE_MODE.APPOINTMENT_ONLY,
    QUEUE_MODE.HYBRID,
  ]),
  queueConfig: queueConfigSchema.optional(),
  appointmentConfig: appointmentConfigSchema.optional(),
});

export const generateAiSectionSchema = z.object({
  section: z.enum(['eligibility', 'documents', 'workflow', 'queue']).optional(),
});

export const applyAiSuggestionsSchema = z.object({
  section: z.enum(['eligibility', 'documents', 'workflow', 'queue']).optional(),
  acceptEligibility: z.boolean().optional(),
  acceptDocuments: z.boolean().optional(),
  acceptWorkflow: z.boolean().optional(),
  acceptQueue: z.boolean().optional(),
});

export const bulkOfferingActionSchema = z.object({
  offeringIds: z.array(z.string().min(1)).min(1),
  action: z.enum(['enable', 'disable', 'archive']),
});

export { AI_HANDLER, HANDLER_TYPE, OUTCOME_TYPE };
