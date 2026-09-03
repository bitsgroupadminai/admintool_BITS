import {
  evaluateEligibilityRules,
  isAcademicEligibilityDocument,
} from '../../shared/helpers/eligibilityEvaluation.helper.js';

/**
 * Pure decision logic for AI verification. Kept free of DB / OpenAI / queue imports
 * so it can be unit tested in isolation.
 */

export const INTERNAL_ACTION = {
  APPROVE: 'approve',
  RETURN: 'return',
  ESCALATE: 'escalate',
};

/**
 * Map a document-verification verdict + confidence to an action using thresholds.
 *
 * @param {{
 *   verdict: 'pass' | 'fail' | 'uncertain',
 *   confidence: number,
 *   thresholds: { autoApprove: number, autoReject: number },
 *   forceEscalate?: boolean,
 * }} params
 */
export function decideDocumentAction({ verdict, confidence, thresholds, forceEscalate = false }) {
  if (forceEscalate) return INTERNAL_ACTION.ESCALATE;
  if (verdict === 'pass' && confidence >= thresholds.autoApprove) {
    return INTERNAL_ACTION.APPROVE;
  }
  if (verdict === 'fail' && confidence >= thresholds.autoReject) {
    return INTERNAL_ACTION.RETURN;
  }
  return INTERNAL_ACTION.ESCALATE;
}

function documentMergePriority(requirementName) {
  const name = String(requirementName ?? '').toLowerCase();
  if (/class\s*12|xii|10\s*\+\s*2|senior secondary|graduation|degree|ug\b/.test(name)) return 3;
  if (/class\s*11|\bxi\b/.test(name)) return 2;
  if (/class\s*10|\bx\b|secondary/.test(name)) return 1;
  return 2;
}

function fieldHasValue(field) {
  return field?.field && field.value != null && field.value !== '';
}

/**
 * Collapse per-document extractions into one profile. Later / higher-priority
 * documents overwrite the same field (Class 12 beats Class 10).
 */
export function mergeExtractedFields(perDocument = [], fallback = []) {
  if (!perDocument.length) return fallback;
  const ranked = [...perDocument].sort(
    (left, right) =>
      documentMergePriority(left.requirementName) - documentMergePriority(right.requirementName),
  );
  const byField = new Map();
  for (const doc of ranked) {
    for (const field of doc.extractedFields ?? []) {
      if (fieldHasValue(field)) {
        byField.set(
          String(field.field)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' '),
          field,
        );
      }
    }
  }
  const merged = [...byField.values()];
  return merged.length ? merged : fallback;
}

export function buildProfileFromDocument(doc = {}) {
  const extractedFields = [...(doc.extractedFields ?? [])];
  if (doc.qualification) {
    extractedFields.push({ field: 'Qualification', value: doc.qualification });
  }
  if (doc.aggregate != null && doc.aggregate !== '') {
    extractedFields.push({ field: 'Aggregate Requirement', value: doc.aggregate });
    extractedFields.push({ field: 'aggregate', value: doc.aggregate });
  }
  if (doc.examScore != null && doc.examScore !== '') {
    extractedFields.push({ field: 'BITSAT', value: doc.examScore });
    extractedFields.push({ field: 'exam score', value: doc.examScore });
  }
  if (doc.subjects?.length) {
    extractedFields.push({
      field: 'Subjects',
      value: doc.subjects.map((subject) => subject.name).join(', '),
    });
  }

  const profile = buildProfileFromExtractedFields(extractedFields);
  profile.qualification = doc.qualification || profile.customFields.qualification || null;
  profile.aggregate = doc.aggregate ?? profile.customFields.aggregate ?? null;
  profile.examScore = doc.examScore ?? profile.customFields.bitsat ?? null;
  profile.subjects = doc.subjects ?? [];
  return profile;
}

export function summarizeDocumentEvaluation(evaluation = {}) {
  const applicable = (evaluation.results ?? []).filter((result) => result.status !== 'not_applicable');
  if (applicable.some((result) => result.status === 'failed')) return 'failed';
  if (applicable.some((result) => result.status === 'unchecked')) return 'unchecked';
  if (applicable.some((result) => result.status === 'passed')) return 'passed';
  return 'not_applicable';
}

export function evaluateEligibilityByDocument(perDocument = [], eligibilityRules = []) {
  return (perDocument ?? [])
    .filter(
      (doc) =>
        doc.relevantToEligibility !== false &&
        isAcademicEligibilityDocument(doc.requirementName, doc),
    )
    .map((doc) => {
      const extractedFields = doc.extractedFields ?? [];
      const eligibilityResult = evaluateEligibilityRules(
        eligibilityRules,
        buildProfileFromDocument(doc),
        { requirementName: doc.requirementName },
      );
      return {
        requirementName: doc.requirementName || 'Document',
        qualification: doc.qualification ?? '',
        aggregate: doc.aggregate ?? null,
        examScore: doc.examScore ?? null,
        subjects: doc.subjects ?? [],
        extractedFields,
        eligibilityResult,
        verdict: summarizeDocumentEvaluation(eligibilityResult),
      };
    });
}

/**
 * Build an eligibility profile from AI-extracted fields so the deterministic rule
 * engine can compare values (AI only extracts; code decides pass/fail).
 *
 * @param {Array<{ field?: string, value?: unknown }>} fields
 */
export function buildProfileFromExtractedFields(fields = []) {
  const customFields = {};
  for (const field of fields) {
    const key = String(field.field ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ');
    if (key) {
      customFields[key] = field.value;
    }
  }
  return {
    programmeName: null,
    enrollmentStatus: null,
    qualification: null,
    customFields,
  };
}

/**
 * Decide the eligibility action by combining extraction confidence with a
 * deterministic evaluation of the offering's rules.
 *
 * @param {{
 *   verdict: 'pass' | 'fail' | 'uncertain',
 *   confidence: number,
 *   extractedFields: Array<{ field?: string, value?: unknown }>,
 *   eligibilityRules: Array<object>,
 *   thresholds: { autoApprove: number, autoReject: number },
 * }} params
 * @returns {{ action: string, evaluation: object }}
 */
function isClass10Name(requirementName) {
  const name = String(requirementName ?? '').toLowerCase();
  return /class\s*10|\bx\b|secondary/.test(name) && !/12|xii|senior|\+2/.test(name);
}

export function mergeEligibilityProfile(perDocument = [], fallbackFields = []) {
  const academic = (perDocument ?? []).filter(
    (doc) =>
      doc.relevantToEligibility !== false &&
      isAcademicEligibilityDocument(doc.requirementName, doc),
  );
  const ranked = [...academic].sort(
    (left, right) =>
      documentMergePriority(left.requirementName) - documentMergePriority(right.requirementName),
  );
  const merged = {
    extractedFields: mergeExtractedFields(academic, fallbackFields),
    qualification: '',
    aggregate: null,
    examScore: null,
    subjects: [],
  };
  for (const doc of ranked) {
    if (doc.qualification) merged.qualification = doc.qualification;
    if (doc.aggregate != null) merged.aggregate = doc.aggregate;
    if (doc.examScore != null) merged.examScore = doc.examScore;
  }
  const subjectSource =
    [...ranked].reverse().find((doc) => doc.subjects?.length && !isClass10Name(doc.requirementName)) ??
    [...ranked].reverse().find((doc) => doc.subjects?.length);
  if (subjectSource) merged.subjects = subjectSource.subjects;
  return buildProfileFromDocument(merged);
}

export function decideEligibilityAction({
  verdict,
  confidence,
  extractedFields,
  eligibilityRules,
  thresholds,
  profile,
}) {
  const evaluation = evaluateEligibilityRules(
    eligibilityRules,
    profile ?? buildProfileFromExtractedFields(extractedFields),
  );
  const hasUnchecked = evaluation.results.some((result) => result.status === 'unchecked');

  let action;
  if (hasUnchecked || verdict === 'uncertain') {
    action = INTERNAL_ACTION.ESCALATE;
  } else if (!evaluation.eligible) {
    action =
      confidence >= thresholds.autoReject ? INTERNAL_ACTION.RETURN : INTERNAL_ACTION.ESCALATE;
  } else {
    action =
      confidence >= thresholds.autoApprove ? INTERNAL_ACTION.APPROVE : INTERNAL_ACTION.ESCALATE;
  }

  return { action, evaluation };
}
