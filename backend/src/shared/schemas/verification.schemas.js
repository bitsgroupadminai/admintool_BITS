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

function looseBoolean(fallback) {
  return z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 'yes' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 'no' || value === 0 || value === '0') return false;
    if (value == null || value === '') return fallback;
    return value;
  }, z.boolean().default(fallback));
}

function looseConfidence(value) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(numeric)) return value;
  if (Number.isInteger(numeric) && numeric > 1 && numeric <= 100) return numeric / 100;
  if (numeric > 100) return 1;
  if (numeric < 0) return 0;
  return numeric;
}

function looseVerdict(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  if (text === 'pass' || text === 'eligible' || text === 'ok') return 'pass';
  if (text === 'fail' || text === 'ineligible' || text === 'reject') return 'fail';
  if (text === 'uncertain' || text === 'unknown' || text === 'review') return 'uncertain';
  return 'uncertain';
}

function subjectScoreFromUnknown(item) {
  if (typeof item === 'string') return { name: item.trim() };
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name ?? item.subject ?? item.subjectName ?? '').trim();
  if (!name) return null;
  return {
    name: name.slice(0, 120),
    score: item.score ?? item.marks ?? item.total ?? item.obtained ?? item.rawScore,
    maxScore: item.maxScore ?? item.maxMarks ?? item.outOf,
    grade: item.grade,
  };
}

function normalizeSubjectList(value) {
  if (value == null || value === '') return [];
  let rows;
  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === 'object') {
    rows = Object.entries(value).map(([name, score]) => ({ name, score }));
  } else {
    rows = String(value)
      .split(/[;|\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const scored = part.match(/^(.+?)\s*[:=\-]\s*(\d{1,3}(?:\.\d+)?)/);
        return scored ? { name: scored[1].trim(), score: Number(scored[2]) } : { name: part };
      });
  }
  return rows.map(subjectScoreFromUnknown).filter(Boolean).slice(0, 30);
}

function coerceExtractedValue(value) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value).slice(0, 500);
  }
  return String(value);
}

const extractedFieldSchema = z.object({
  field: clippedString(120, 'Field'),
  value: z.preprocess(coerceExtractedValue, z.union([z.string(), z.number(), z.boolean()]).nullable()),
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
  present: looseBoolean(false),
  matchesRequirement: looseBoolean(false),
  legible: looseBoolean(true),
  belongsToApplicant: looseBoolean(true),
  verdict: z.preprocess(looseVerdict, verdictEnum),
  observedContent: clippedString(800),
  issue: clippedString(1200),
  documentExcerpt: clippedString(500),
  relevantToEligibility: looseBoolean(false).optional(),
  qualification: clippedString(200),
  aggregate: looseNumber,
  examScore: looseNumber,
  subjects: z.preprocess(normalizeSubjectList, z.array(subjectScoreSchema).max(30).default([])),
  extractedFields: z.array(extractedFieldSchema).max(40).default([]),
});

export const documentVerificationResponseSchema = z.object({
  verdict: z.preprocess(looseVerdict, verdictEnum),
  confidence: z.preprocess(looseConfidence, z.number().min(0).max(1)),
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
  verdict: z.preprocess(looseVerdict, verdictEnum),
  confidence: z.preprocess(looseConfidence, z.number().min(0).max(1)),
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

/**
 * Clean Zod shapes sent to OpenAI structured outputs (strict JSON schema).
 * No preprocess/unions — the API rejects those. Parsing still uses the
 * more tolerant schemas above.
 */
const structuredSubjectSchema = z.object({
  name: z.string().describe('Subject or section name as printed on the document'),
  score: z
    .number()
    .nullable()
    .describe('Numeric marks obtained. Null only if no number is visible.'),
  maxScore: z.number().nullable().describe('Paper total if printed, otherwise null'),
  grade: z.string().describe('Letter grade if printed, otherwise empty string'),
});

const structuredExtractedFieldSchema = z.object({
  field: z.string().describe('Exact eligibility rule name, or empty string'),
  value: z
    .string()
    .nullable()
    .describe('Extracted value as text, or null when the rule does not apply'),
  documentExcerpt: z.string().describe('Short verbatim quote, or empty string'),
});

const structuredDocumentFindingSchema = z.object({
  requirementName: z.string().describe('Exact required-document name'),
  present: z.boolean(),
  matchesRequirement: z.boolean(),
  legible: z.boolean(),
  belongsToApplicant: z.boolean(),
  verdict: verdictEnum,
  observedContent: z.string().describe('What the file actually shows'),
  issue: z.string().describe('Problem and what to upload instead, or empty string'),
  documentExcerpt: z.string(),
  relevantToEligibility: z.boolean(),
  qualification: z.string().describe('Class X, Class XII (10+2), BITSAT, or empty string'),
  aggregate: z.number().nullable().describe('Overall percentage or total for this file'),
  examScore: z.number().nullable().describe('BITSAT/entrance total only; otherwise null'),
  subjects: z
    .array(structuredSubjectSchema)
    .describe('Every subject/section on this file with numeric scores'),
  extractedFields: z.array(structuredExtractedFieldSchema),
});

export const documentVerificationStructuredSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().describe('0 to 1'),
  summary: z.string(),
  perDocument: z.array(structuredDocumentFindingSchema),
  extractedFields: z.array(structuredExtractedFieldSchema),
  issues: z.array(z.string()),
});

const structuredEligibilityDocumentSchema = z.object({
  requirementName: z.string(),
  relevantToEligibility: z.boolean(),
  qualification: z.string(),
  aggregate: z.number().nullable(),
  examScore: z.number().nullable(),
  subjects: z.array(structuredSubjectSchema),
  extractedFields: z.array(structuredExtractedFieldSchema),
});

export const eligibilityVerificationStructuredSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().describe('0 to 1'),
  summary: z.string(),
  perDocument: z.array(structuredEligibilityDocumentSchema),
  extractedFields: z.array(structuredExtractedFieldSchema),
  issues: z.array(z.string()),
});

export const intakeVerificationStructuredSchema = z.object({
  verdict: verdictEnum,
  confidence: z.number().describe('0 to 1'),
  recommendation: z.enum(['approve', 'reject', 'manual_review']),
  summary: z.string(),
  issues: z.array(z.string()),
});
