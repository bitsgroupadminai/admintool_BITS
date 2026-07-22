import { z } from 'zod';

/**
 * Structured output contracts for AI-driven verification.
 * Verdicts are advisory: the service maps them to workflow outcomes using
 * confidence thresholds, and low-confidence results escalate to staff.
 */

export const VERIFICATION_VERDICT = {
  PASS: 'pass',
  FAIL: 'fail',
  UNCERTAIN: 'uncertain',
};

const verdictEnum = z.enum(['pass', 'fail', 'uncertain']);

const documentFindingSchema = z.object({
  requirementName: z.string().min(1).max(200),
  present: z.boolean().default(false),
  matchesRequirement: z.boolean().default(false),
  legible: z.boolean().default(true),
  belongsToApplicant: z.boolean().default(true),
  verdict: verdictEnum,
  issue: z.string().max(500).optional().default(''),
  documentExcerpt: z.string().max(500).optional().default(''),
});

export const documentVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(1500),
  perDocument: z.array(documentFindingSchema).max(30).default([]),
  issues: z.array(z.string().min(1).max(500)).max(30).default([]),
});

const extractedFieldSchema = z.object({
  field: z.string().min(1).max(120),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  documentExcerpt: z.string().max(500).optional().default(''),
});

export const eligibilityVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(1500),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
  issues: z.array(z.string().min(1).max(500)).max(30).default([]),
});

export const intakeVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  recommendation: z.enum(['approve', 'reject', 'manual_review']),
  summary: z.string().min(1).max(1500),
  issues: z.array(z.string().min(1).max(500)).max(30).default([]),
});
