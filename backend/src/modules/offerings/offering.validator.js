import { z } from 'zod';
import {
  QUEUE_MODE,
  RULE_FIELD_TYPE,
  RULE_OPERATOR,
  SLA_UNIT,
  DOCUMENT_FILE_TYPES,
  OFFERING_STATUS,
  APPLICANT_FIELD_TYPE,
} from '../../shared/enums/offering.enums.js';
import {
  HANDLER_TYPE,
  AI_HANDLER,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from '../../shared/enums/workflow.enums.js';
import {
  normalizeOperatingHoursTime,
  validateOperatingHoursWindow,
} from '../../shared/helpers/operatingHours.helper.js';
import { paymentConfigSchema } from '../payments/payment.validator.js';

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

const optionalScore = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.number().min(0).max(1000).nullable().optional(),
);

export const documentEligibilitySchema = z.object({
  enabled: z.boolean().optional().default(false),
  qualification: z.string().max(200).optional().default(''),
  aggregateMin: optionalScore,
  subjectThreshold: optionalScore,
  requiredSubjects: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        minScore: optionalScore,
      }),
    )
    .max(30)
    .optional()
    .default([]),
});

const documentRequirementSchema = z.object({
  name: z.string().min(1).max(120),
  required: z.boolean(),
  allowedTypes: z.array(z.enum(DOCUMENT_FILE_TYPES)).min(1),
  maxSizeMb: z.number().min(1).max(25),
  eligibility: documentEligibilitySchema.optional(),
});

const outcomeRouteSchema = z.object({
  action: z.enum(Object.values(ROUTE_ACTION)),
  nextStepId: z.string().nullish(),
  terminalState: z.enum(Object.values(TERMINAL_STATE)).nullish(),
  returnToStepId: z.string().nullish(),
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
  staffInstructions: z.string().trim().min(1).max(1000),
  adminInstructions: z.string().trim().min(1).max(1000),
  studentInstructions: z.string().trim().min(1).max(1000),
  studentEmail: z
    .object({
      subject: z.string().trim().max(200).optional().default(''),
      headline: z.string().trim().max(200).optional().default(''),
      body: z.string().trim().max(4000).optional().default(''),
    })
    .optional(),
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
  avgServiceMinutes: z.number().int().min(1).optional(),
  counters: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().min(1).max(80),
        active: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
});

const operatingHoursSchema = z
  .string()
  .min(1)
  .transform((value) => normalizeOperatingHoursTime(value))
  .refine((value) => Boolean(value), {
    message: 'Use 24-hour time such as 09:00 or 17:00',
  });

const operatingDaysSchema = z.array(z.number().int().min(0).max(6)).min(1).max(7);

const appointmentConfigSchema = z
  .object({
    slotDurationMinutes: z.number().int().min(5),
    slotCapacity: z.number().int().min(1).optional(),
    operatingHoursStart: operatingHoursSchema,
    operatingHoursEnd: operatingHoursSchema,
    operatingDays: operatingDaysSchema.optional(),
    bookingHorizonDays: z.number().int().min(1).max(60).optional(),
    virtualAppointment: z
      .object({
        enabled: z.boolean().optional(),
        allowedProviders: z.array(z.enum(['google_meet', 'zoom', 'manual'])).optional(),
        defaultProvider: z.enum(['google_meet', 'zoom', 'manual']).optional(),
        autoGenerateLink: z.boolean().optional(),
        autoSendLinkOnConfirm: z.boolean().optional(),
        allowAdditionalRecipients: z.boolean().optional(),
        maxAdditionalRecipients: z.number().int().min(1).max(500).optional(),
      })
      .optional(),
  })
  .superRefine((config, ctx) => {
    const validation = validateOperatingHoursWindow(
      config.operatingHoursStart,
      config.operatingHoursEnd,
    );

    if (!validation.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          validation.reason === 'end_before_start'
            ? 'Closing time must be after opening time (use 24-hour format, e.g. 09:00 and 17:00)'
            : 'Use 24-hour times like 09:00 and 17:00',
        path: ['operatingHoursEnd'],
      });
    }
  });

const applicantFieldSchema = z.object({
  fieldKey: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(120),
  fieldType: z.enum(Object.values(APPLICANT_FIELD_TYPE)),
  required: z.boolean().default(true),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(300).optional(),
  options: z.array(z.string().min(1).max(120)).optional(),
  order: z.number().int().min(1).optional(),
});

const intakeDocumentSchema = z.object({
  label: z.string().max(120).optional(),
  helpText: z.string().max(300).optional(),
  required: z.boolean().optional(),
  allowedTypes: z.array(z.enum(DOCUMENT_FILE_TYPES)).min(1).optional(),
  maxSizeMb: z.number().min(1).max(25).optional(),
});

export const updateOfferingDetailsSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    visitLocation: z.string().max(500).optional().nullable(),
    visitInstructions: z.string().max(2000).optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    applicantFields: z.array(applicantFieldSchema).optional(),
    intakeDocument: intakeDocumentSchema.optional().nullable(),
    paymentConfig: paymentConfigSchema.optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.startDate && payload.endDate) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Closing date must be on or after the opening date',
          path: ['endDate'],
        });
      }
    }

    if (payload.applicantFields?.length) {
      const labels = payload.applicantFields.map((field) => field.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Applicant field labels must be unique',
          path: ['applicantFields'],
        });
      }

      payload.applicantFields.forEach((field, index) => {
        if (field.fieldType === APPLICANT_FIELD_TYPE.SELECT && !(field.options?.length >= 1)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Dropdown fields need at least one option',
            path: ['applicantFields', index, 'options'],
          });
        }
      });
    }
  });

export const createOfferingSchema = z.object({
  name: z.string().min(2).max(200),
  serviceId: z.string().min(1),
});

export const updateOfferingSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  visitLocation: z.string().max(500).optional().nullable(),
  visitInstructions: z.string().max(2000).optional().nullable(),
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

export const updateEligibilitySchema = z
  .object({
    documents: z
      .array(
        z.object({
          name: z.string().min(1).max(120),
          eligibility: documentEligibilitySchema,
        }),
      )
      .min(1)
      .optional(),
    rules: z.array(eligibilityRuleSchema).min(1).optional(),
  })
  .refine((payload) => Boolean(payload.documents?.length || payload.rules?.length), {
    message: 'Set eligibility on at least one document',
  });

export const updateDocumentsSchema = z.object({
  requirements: z.array(documentRequirementSchema).min(1),
});

export const updateWorkflowSchema = z.object({
  steps: z.array(workflowStepSchema).min(1),
});

export const updateQueueSchema = z
  .object({
    queueMode: z.enum([
      QUEUE_MODE.QUEUE_ONLY,
      QUEUE_MODE.APPOINTMENT_ONLY,
      QUEUE_MODE.HYBRID,
    ]),
    queueConfig: queueConfigSchema.optional(),
    appointmentConfig: appointmentConfigSchema.optional(),
  })
  .superRefine((payload, ctx) => {
    const needsQueue =
      payload.queueMode === QUEUE_MODE.QUEUE_ONLY || payload.queueMode === QUEUE_MODE.HYBRID;
    const needsAppointment =
      payload.queueMode === QUEUE_MODE.APPOINTMENT_ONLY || payload.queueMode === QUEUE_MODE.HYBRID;

    if (needsQueue && !payload.queueConfig?.capacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Queue capacity is required',
        path: ['queueConfig', 'capacity'],
      });
    }

    if (needsAppointment && !payload.appointmentConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Appointment settings are required',
        path: ['appointmentConfig'],
      });
    }
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
