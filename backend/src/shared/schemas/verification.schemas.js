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

function clippedString(max, fallback = '') {
  return z.preprocess((value) => {
    if (value == null) return fallback;
    const text = String(value);
    const next = text.trim() ? text : fallback;
    return next.length > max ? next.slice(0, max) : next;
  }, z.string().max(max).optional().default(fallback));
}

function normalizeSubjectList(value) {
  if (value == null || value === '') return [];
  const rows = Array.isArray(value)
    ? value
    : String(value)
        .split(/[;|\n]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const scored = part.match(/^(.+?)\s*[:=\-]\s*(\d{1,3}(?:\.\d+)?)/);
          return scored ? { name: scored[1].trim(), score: Number(scored[2]) } : { name: part };
        });
  return rows
    .map((item) => {
      if (typeof item === 'string') return { name: item.trim() };
      if (!item || typeof item !== 'object') return null;
      const name = String(item.name ?? item.subject ?? '').trim();
      if (!name) return null;
      return {
        name: name.slice(0, 120),
        score: item.score,
        maxScore: item.maxScore,
        grade: item.grade,
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

const extractedFieldSchema = z.object({
  field: clippedString(120, 'Field'),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  documentExcerpt: clippedString(500),
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
  grade: clippedString(20),
});

const documentFindingSchema = z.object({
  requirementName: clippedString(200, 'Document'),
  present: z.boolean().default(false),
  matchesRequirement: z.boolean().default(false),
  legible: z.boolean().default(true),
  belongsToApplicant: z.boolean().default(true),
  verdict: verdictEnum,
  observedContent: clippedString(400),
  issue: clippedString(1200),
  documentExcerpt: clippedString(500),
  relevantToEligibility: z.boolean().optional().default(false),
  qualification: clippedString(200),
  aggregate: looseNumber,
  examScore: looseNumber,
  subjects: z.preprocess(normalizeSubjectList, z.array(subjectScoreSchema).max(30).default([])),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
});

export const documentVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  summary: clippedString(2500, 'Verification complete.'),
  perDocument: z.array(documentFindingSchema).max(30).default([]),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
  issues: z.array(clippedString(800)).max(30).default([]),
});

const eligibilityDocumentExtractionSchema = z.object({
  requirementName: clippedString(200, 'Document'),
  relevantToEligibility: z.boolean().optional().default(true),
  qualification: clippedString(200),
  aggregate: looseNumber,
  examScore: looseNumber,
  subjects: z.preprocess(normalizeSubjectList, z.array(subjectScoreSchema).max(30).default([])),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
});

export const eligibilityVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  summary: clippedString(2500, 'Extraction complete.'),
  perDocument: z.array(eligibilityDocumentExtractionSchema).max(30).default([]),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
  issues: z.array(clippedString(800)).max(30).default([]),
});

export const intakeVerificationResponseSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().min(0).max(1),
  recommendation: z.enum(['approve', 'reject', 'manual_review']),
  summary: z.string().min(1).max(2500),
  issues: z.array(z.string().min(1).max(800)).max(30).default([]),
});
