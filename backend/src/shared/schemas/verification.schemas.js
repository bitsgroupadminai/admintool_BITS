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

const extractedFieldSchema = z.object({
  field: z.string().min(1).max(120),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  documentExcerpt: z.string().max(500).optional().default(''),
});

const looseNumber = z.preprocess((value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}, z.number().nullable().optional());

const subjectScoreSchema = z.object({
  name: z.string().min(1).max(120),
  score: looseNumber,
  maxScore: looseNumber,
  grade: z.string().max(20).optional().default(''),
});

const documentFindingSchema = z.object({
  requirementName: z.string().min(1).max(200),
  present: z.boolean().default(false),
  matchesRequirement: z.boolean().default(false),
  legible: z.boolean().default(true),
  belongsToApplicant: z.boolean().default(true),
  verdict: verdictEnum,
  observedContent: z.string().max(400).optional().default(''),
  issue: z.string().max(1200).optional().default(''),
  documentExcerpt: z.string().max(500).optional().default(''),
  relevantToEligibility: z.boolean().optional().default(false),
  qualification: z.string().max(200).optional().default(''),
  aggregate: looseNumber,
  examScore: looseNumber,
  subjects: z.array(subjectScoreSchema).max(30).default([]),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
});

export const documentVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(2500),
  perDocument: z.array(documentFindingSchema).max(30).default([]),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
  issues: z.array(z.string().min(1).max(800)).max(30).default([]),
});

const eligibilityDocumentExtractionSchema = z.object({
  requirementName: z.string().min(1).max(200),
  relevantToEligibility: z.boolean().optional().default(true),
  qualification: z.string().max(200).optional().default(''),
  aggregate: looseNumber,
  examScore: looseNumber,
  subjects: z.array(subjectScoreSchema).max(30).default([]),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
});

export const eligibilityVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(2500),
  perDocument: z.array(eligibilityDocumentExtractionSchema).max(30).default([]),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
  issues: z.array(z.string().min(1).max(800)).max(30).default([]),
});

export const intakeVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  recommendation: z.enum(['approve', 'reject', 'manual_review']),
  summary: z.string().min(1).max(2500),
  issues: z.array(z.string().min(1).max(800)).max(30).default([]),
});
