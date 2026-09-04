import { z } from 'zod';

export const suggestedOfferingSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  documentExcerpt: z.string().min(1).max(500),
  rationale: z.string().max(2000).optional(),
});

export const serviceInsightsResponseSchema = z.object({
  understandingSummary: z.string().min(1).max(4000),
  chatbotReadinessSummary: z.string().min(1).max(4000),
  chatbotCanAnswer: z.array(z.string().min(1).max(500)).max(25),
  gaps: z.array(z.string().min(1).max(500)).max(20),
  // Real university catalogues often list 40–80+ programmes under one admissions service.
  suggestedOfferings: z.array(suggestedOfferingSchema).max(80),
});

const eligibilityRuleSchema = z.object({
  field: z.string().min(1),
  fieldType: z.enum(['numeric', 'text', 'boolean']),
  operator: z.enum(['eq', 'neq', 'gte', 'lte', 'gt', 'lt']),
  value: z.union([z.string(), z.number(), z.boolean()]),
  documentExcerpt: z.string().min(1).max(500).optional(),
});

const documentRequirementSchema = z.object({
  name: z.string().min(1),
  required: z.boolean().default(true),
  allowedTypes: z.array(z.enum(['pdf', 'jpg', 'jpeg', 'png'])).default(['pdf']),
  maxSizeMb: z.number().min(1).max(25).default(5),
  documentExcerpt: z.string().min(1).max(500).optional(),
});

const workflowOutcomeRouteSchema = z.object({
  action: z.enum(['next_step', 'end_workflow', 'return_to_student']),
  nextStepOrder: z.number().int().min(1).optional(),
  terminalState: z.enum(['completed', 'rejected']).optional(),
  returnToStepOrder: z.number().int().min(1).nullable().optional(),
  requireReupload: z.array(z.string().min(1)).optional().default([]),
});

const workflowStepOutcomeSchema = z.object({
  type: z.enum(['approved', 'rejected', 'needs_correction']),
  route: workflowOutcomeRouteSchema,
});

const workflowStepSkeletonSchema = z.object({
  order: z.number().int().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  handledByType: z.enum(['staff', 'student', 'ai']),
  handledByAssignee: z.string().min(1),
  slaValue: z.number().min(1).max(720),
  slaUnit: z.enum(['minutes', 'hours', 'days']),
  staffInstructions: z.string().min(1).max(1000),
  adminInstructions: z.string().min(1).max(1000),
  studentInstructions: z.string().min(1).max(1000),
  documentExcerpt: z.string().min(1).max(500).optional(),
});

const workflowStepOutcomesEntrySchema = z.object({
  order: z.number().int().min(1),
  outcomes: z
    .array(workflowStepOutcomeSchema)
    .length(3, 'Each step must have exactly three outcomes: approved, rejected, needs_correction'),
});

const workflowStepSuggestionSchema = workflowStepSkeletonSchema.extend({
  outcomes: z
    .array(workflowStepOutcomeSchema)
    .length(3, 'Each step must have exactly three outcomes: approved, rejected, needs_correction'),
});

export const offeringEligibilityResponseSchema = z.object({
  eligibilityRules: z.array(eligibilityRuleSchema).max(20),
});

export const offeringDocumentsResponseSchema = z.object({
  documentRequirements: z.array(documentRequirementSchema).max(25),
});

export const offeringWorkflowSkeletonResponseSchema = z.object({
  workflowSteps: z.array(workflowStepSkeletonSchema).min(1).max(15),
});

export const offeringWorkflowOutcomesResponseSchema = z.object({
  stepOutcomes: z.array(workflowStepOutcomesEntrySchema).min(1).max(15),
});

export const offeringWorkflowResponseSchema = z.object({
  workflowSteps: z.array(workflowStepSuggestionSchema).max(15),
});

const workflowStepEmailSchema = z.object({
  order: z.number().int().min(1),
  subject: z.string().min(1).max(200),
  headline: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export const offeringWorkflowEmailsResponseSchema = z.object({
  stepEmails: z.array(workflowStepEmailSchema).min(1).max(15),
});

export const offeringQueueResponseSchema = z.object({
  queueMode: z.enum(['queue_only', 'appointment_only', 'hybrid']).nullable().optional(),
  queueConfig: z
    .object({
      capacity: z.number().min(1).max(10000),
      processingRatePerHour: z.number().min(1).max(1000),
    })
    .nullable()
    .optional(),
  appointmentConfig: z
    .object({
      slotDurationMinutes: z.number().min(5).max(240),
      slotCapacity: z.number().min(1).max(100),
      operatingHoursStart: z.string(),
      operatingHoursEnd: z.string(),
    })
    .nullable()
    .optional(),
  documentExcerpt: z.string().max(500).nullable().optional(),
});
