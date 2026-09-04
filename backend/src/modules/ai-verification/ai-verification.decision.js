import {
  evaluateEligibilityRules,
  isAcademicEligibilityDocument,
  parseSubjectEntries,
  inferQualificationLabel,
  isClass12DocumentName,
  isClass10DocumentName,
  isBitsatDocumentName,
  subjectsForDocument,
  parseNumericValue,
  normalizeFieldKey,
  uniqueSubjects,
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
    for (const field of asArray(doc.extractedFields)) {
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
  const extractedFields = [...asArray(doc.extractedFields)];
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
  profile.evidenceText = [
    doc.requirementName,
    doc.qualification,
    profile.evidenceText,
  ]
    .filter(Boolean)
    .join(' ; ');
  profile.qualification =
    doc.qualification ||
    profile.customFields.qualification ||
    inferQualificationLabel(profile.evidenceText) ||
    (isClass12DocumentName(doc.requirementName) ? 'Class XII (10+2)' : null);
  profile.aggregate = doc.aggregate ?? profile.customFields.aggregate ?? profile.customFields['aggregate requirement'] ?? null;
  profile.examScore = doc.examScore ?? profile.customFields.bitsat ?? null;
  profile.subjects = (doc.subjects ?? []).length
    ? doc.subjects
    : parseSubjectEntries(profile.customFields.subjects);
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
        subjects: uniqueSubjects(doc.subjects ?? []),
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
  const evidenceText = fields
    .flatMap((field) => [field.field, field.value, field.documentExcerpt])
    .filter((item) => item != null && item !== '')
    .join(' ; ');
  return {
    programmeName: null,
    enrollmentStatus: null,
    qualification: inferQualificationLabel(evidenceText) || customFields.qualification || null,
    customFields,
    evidenceText,
  };
}

function sourceDocuments(decision = {}) {
  const primary = asArray(decision.perDocument);
  return primary.length ? primary : asArray(decision.raw?.perDocument);
}

function collectDecisionFields(decision = {}) {
  const docs = sourceDocuments(decision);
  const primaryFields = asArray(decision.extractedFields);
  if (primaryFields.length) {
    return [...primaryFields, ...docs.flatMap((doc) => asArray(doc.extractedFields))];
  }
  return [
    ...asArray(decision.raw?.extractedFields),
    ...docs.flatMap((doc) => asArray(doc.extractedFields)),
  ];
}

function documentBucket(requirementName) {
  if (isBitsatDocumentName(requirementName)) return 'bitsat';
  if (isClass12DocumentName(requirementName)) return 'class12';
  if (isClass10DocumentName(requirementName)) return 'class10';
  return String(requirementName ?? '')
    .trim()
    .toLowerCase();
}

function parseNumericFromFields(fields, matcher) {
  for (const field of fields) {
    const blob = `${field.field ?? ''} ${field.value ?? ''} ${field.documentExcerpt ?? ''}`;
    if (!matcher.test(blob)) continue;
    const fromValue = parseNumericValue(field.value);
    if (fromValue != null) return fromValue;
    const fromExcerpt = parseNumericValue(field.documentExcerpt);
    if (fromExcerpt != null) return fromExcerpt;
  }
  return null;
}

function allSubjectEntries(decision, fields) {
  const fromDocs = sourceDocuments(decision).flatMap((doc) => asArray(doc.subjects));
  if (fromDocs.length) return uniqueSubjects(fromDocs);
  const subjectValues = fields
    .filter((field) => {
      const key = normalizeFieldKey(field.field);
      return /subject/.test(key) && !/threshold|mark|score/.test(key);
    })
    .map((field) => field.value)
    .filter((value) => value != null && value !== '');
  return uniqueSubjects(parseSubjectEntries(subjectValues.join('; ')));
}

function seedAcademicDocuments(decision = {}, uploadedDocuments = [], fields = []) {
  const seeded = new Map();

  const remember = (requirementName, extra = {}) => {
    const name = String(requirementName ?? '').trim();
    if (!name || !isAcademicEligibilityDocument(name, extra)) return;
    const bucket = documentBucket(name);
    const current = seeded.get(bucket);
    if (!current) {
      seeded.set(bucket, { requirementName: name, ...extra });
      return;
    }
    seeded.set(bucket, {
      ...current,
      ...extra,
      requirementName: current.requirementName || name,
      extractedFields: [...asArray(current.extractedFields), ...asArray(extra.extractedFields)],
      subjects: uniqueSubjects(
        current.subjects?.length ? current.subjects : extra.subjects,
      ),
    });
  };

  for (const doc of sourceDocuments(decision)) {
    remember(doc.requirementName, doc);
  }
  for (const uploaded of uploadedDocuments) {
    remember(uploaded.requirementName || uploaded.name);
  }
  for (const field of fields) {
    for (const piece of String(field.documentExcerpt ?? '').split(/[;]/)) {
      const label = piece.trim();
      if (label) remember(label);
    }
  }

  return [...seeded.values()];
}

function fillDocumentExtraction(doc, decision, fields) {
  const localEvidence = [
    doc.requirementName,
    doc.qualification,
    ...(asArray(doc.extractedFields)).flatMap((field) => [field.value, field.documentExcerpt]),
  ]
    .filter((item) => item != null && item !== '')
    .join(' ; ');

  const qualification =
    doc.qualification ||
    inferQualificationLabel(localEvidence) ||
    inferQualificationLabel(doc.requirementName) ||
    (isClass12DocumentName(doc.requirementName) ? 'Class XII (10+2)' : '') ||
    (isClass10DocumentName(doc.requirementName) ? 'Class X' : '');

  const ownSubjects = uniqueSubjects(doc.subjects);
  const localSubjectField = asArray(doc.extractedFields)
    .filter((field) => /subject/.test(normalizeFieldKey(field.field)) && !/threshold/.test(normalizeFieldKey(field.field)))
    .map((field) => field.value)
    .filter((value) => value != null && value !== '')
    .join('; ');
  let subjects = ownSubjects.length ? ownSubjects : uniqueSubjects(parseSubjectEntries(localSubjectField));
  if (!subjects.length && !isBitsatDocumentName(doc.requirementName)) {
    subjects = uniqueSubjects(
      subjectsForDocument(allSubjectEntries(decision, fields), doc.requirementName),
    );
  }

  const aggregate =
    doc.aggregate ??
    parseNumericFromFields(asArray(doc.extractedFields), /aggregate|percentage|overall|total/i);
  const examScore =
    doc.examScore ??
    (isBitsatDocumentName(doc.requirementName)
      ? parseNumericFromFields([...asArray(doc.extractedFields), ...fields], /bitsat|entrance|exam score/i)
      : null);

  return {
    ...doc,
    relevantToEligibility: true,
    qualification,
    aggregate,
    examScore,
    subjects,
  };
}

export function hydrateEligibilityDecision(decision = {}, { eligibilityRules = [], documents = [] } = {}) {
  if (decision.handler && decision.handler !== 'eligibility_screening') {
    return decision;
  }

  const fields = collectDecisionFields(decision);
  const seeded = seedAcademicDocuments(decision, documents, fields).map((doc) =>
    fillDocumentExtraction(doc, decision, fields),
  );
  const perDocument = evaluateEligibilityByDocument(seeded, eligibilityRules);
  const profile = mergeEligibilityProfile(seeded, fields);
  const evaluation = evaluateEligibilityRules(eligibilityRules, profile);
  const hasUnchecked = (evaluation.results ?? []).some((result) => result.status === 'unchecked');

  let summary;
  if (!evaluation.eligible) {
    summary = 'The extracted values do not meet one or more eligibility criteria.';
  } else if (hasUnchecked) {
    summary = 'Some eligibility values could not be confirmed from the uploaded documents.';
  } else {
    summary = 'The extracted values meet the configured eligibility criteria.';
  }

  return {
    ...decision,
    summary,
    issues: (evaluation.results ?? [])
      .filter((result) => result.status === 'failed' || result.status === 'unchecked')
      .map((result) => result.message),
    perDocument,
    eligibilityResult: evaluation,
    verdict: !evaluation.eligible ? 'fail' : hasUnchecked ? 'uncertain' : decision.verdict || 'pass',
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
  return isClass10DocumentName(requirementName);
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
