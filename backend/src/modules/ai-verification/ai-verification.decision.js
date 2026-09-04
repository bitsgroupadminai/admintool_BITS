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
  preferScoredSubjects,
} from '../../shared/helpers/eligibilityEvaluation.helper.js';
import {
  hasScopedDocumentEligibility,
  rulesForDocument,
  subjectThresholdsFromEligibility,
} from '../../shared/helpers/documentEligibility.helper.js';

/**
 * Pure decision logic for AI verification. Kept free of DB / OpenAI / queue imports
 * so it can be unit tested in isolation.
 */

export const INTERNAL_ACTION = {
  APPROVE: 'approve',
  RETURN: 'return',
  ESCALATE: 'escalate',
};

export const ELIGIBILITY_VERDICT = {
  ELIGIBLE: 'eligible',
  INELIGIBLE: 'ineligible',
};

function eligibilityEvaluationBlocksApprove(evaluation) {
  if (!evaluation) return false;
  if (evaluation.eligible === false) return true;
  return (evaluation.results ?? []).some((result) => result.status === 'unchecked');
}

/**
 * Map a document-verification verdict + confidence to an action using thresholds.
 * When eligibility rules exist, a document is auto-approved only if it is valid
 * and the extracted scores meet those rules.
 *
 * @param {{
 *   verdict: 'pass' | 'fail' | 'uncertain',
 *   confidence: number,
 *   thresholds: { autoApprove: number, autoReject: number },
 *   forceEscalate?: boolean,
 *   eligibilityEvaluation?: { eligible?: boolean, results?: Array<{ status?: string }> } | null,
 * }} params
 */
export function decideDocumentAction({
  verdict,
  confidence,
  thresholds,
  forceEscalate = false,
  eligibilityEvaluation = null,
}) {
  if (forceEscalate) return INTERNAL_ACTION.ESCALATE;
  if (verdict === 'uncertain') return INTERNAL_ACTION.ESCALATE;

  const eligibilityFailed = eligibilityEvaluation?.eligible === false;
  const eligibilityUnchecked = (eligibilityEvaluation?.results ?? []).some(
    (result) => result.status === 'unchecked',
  );

  if (verdict === 'fail' && confidence >= thresholds.autoReject) {
    return INTERNAL_ACTION.RETURN;
  }
  if (eligibilityFailed && !eligibilityUnchecked && confidence >= thresholds.autoReject) {
    return INTERNAL_ACTION.RETURN;
  }
  if (eligibilityEvaluationBlocksApprove(eligibilityEvaluation)) {
    return INTERNAL_ACTION.ESCALATE;
  }
  if (verdict === 'pass' && confidence >= thresholds.autoApprove) {
    return INTERNAL_ACTION.APPROVE;
  }
  return INTERNAL_ACTION.ESCALATE;
}

export function authenticityBlocksEligibility(finding = {}) {
  if (finding.present === false) return true;
  if (finding.matchesRequirement === false) return true;
  if (finding.belongsToApplicant === false) return true;
  if (finding.legible === false) return true;
  const authenticity =
    finding.authenticityVerdict ||
    (finding.verdict === ELIGIBILITY_VERDICT.ELIGIBLE ||
    finding.verdict === ELIGIBILITY_VERDICT.INELIGIBLE
      ? null
      : finding.verdict);
  return authenticity === 'fail' || authenticity === 'uncertain';
}

export function documentEligibilityVerdict({ finding = {}, eligibilityStatus = 'not_applicable', isAcademic = false }) {
  if (authenticityBlocksEligibility(finding)) return ELIGIBILITY_VERDICT.INELIGIBLE;
  if (!isAcademic) return ELIGIBILITY_VERDICT.ELIGIBLE;
  if (eligibilityStatus === 'failed' || eligibilityStatus === 'unchecked') {
    return ELIGIBILITY_VERDICT.INELIGIBLE;
  }
  return ELIGIBILITY_VERDICT.ELIGIBLE;
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

export function evaluateEligibilityByDocument(
  perDocument = [],
  eligibilityRules = [],
  documentRequirements = [],
) {
  const requirements = documentRequirements ?? [];
  return (perDocument ?? [])
    .filter((doc) => {
      const requirement = findRequirement(requirements, doc.requirementName);
      if (requirement?.eligibility) {
        return requirement.eligibility.enabled !== false;
      }
      return (
        doc.relevantToEligibility !== false &&
        isAcademicEligibilityDocument(doc.requirementName, doc)
      );
    })
    .map((doc) => {
      const requirement = findRequirement(requirements, doc.requirementName);
      const { rules, scoped, eligibility } = rulesForDocument(requirement, eligibilityRules);
      const extractedFields = doc.extractedFields ?? [];
      const eligibilityResult = rules.length
        ? evaluateEligibilityRules(rules, {
            ...buildProfileFromDocument(doc),
            ...(scoped
              ? {
                  subjectThresholds: subjectThresholdsFromEligibility(eligibility),
                  defaultSubjectThreshold: eligibility?.subjectThreshold ?? null,
                }
              : {}),
          }, scoped ? { scoped: true } : { requirementName: doc.requirementName })
        : { eligible: true, failures: [], results: [] };
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

function findRequirement(documentRequirements, requirementName) {
  const key = findingNameKey(requirementName);
  return (documentRequirements ?? []).find(
    (requirement) => findingNameKey(requirement.name ?? requirement.requirementName) === key,
  );
}

function combinePerDocumentEvaluations(perDocument = []) {
  const results = (perDocument ?? []).flatMap((doc) =>
    (doc.eligibilityResult?.results ?? [])
      .filter((result) => result.status !== 'not_applicable')
      .map((result) => ({
        ...result,
        field: `${doc.requirementName}: ${result.field}`,
      })),
  );
  const failures = results.filter((result) => result.status === 'failed').map((result) => result.field);
  const eligible = (perDocument ?? []).every((doc) => doc.eligibilityResult?.eligible !== false);
  return { eligible, failures, results };
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
  const fromRaw = asArray(decision.raw?.perDocument);
  if (!primary.length) return fromRaw;
  if (!fromRaw.length) return primary;

  const rawByName = new Map(
    fromRaw.map((doc) => [findingNameKey(doc.requirementName), doc]),
  );
  return primary.map((doc) => {
    const rawDoc = rawByName.get(findingNameKey(doc.requirementName));
    if (!rawDoc) return doc;
    return {
      ...doc,
      aggregate: doc.aggregate ?? rawDoc.aggregate,
      examScore: doc.examScore ?? rawDoc.examScore,
      qualification: doc.qualification || rawDoc.qualification,
      observedContent: doc.observedContent || rawDoc.observedContent,
      documentExcerpt: doc.documentExcerpt || rawDoc.documentExcerpt,
      subjects: preferScoredSubjects(doc.subjects, rawDoc.subjects),
      extractedFields: [...asArray(doc.extractedFields), ...asArray(rawDoc.extractedFields)],
    };
  });
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
      subjects: preferScoredSubjects(current.subjects, extra.subjects),
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
    .flatMap((field) => [field.value, field.documentExcerpt])
    .filter((value) => value != null && value !== '')
    .join('; ');
  const quotedScores = parseSubjectEntries(
    [doc.observedContent, doc.documentExcerpt, doc.issue, localEvidence].filter(Boolean).join('; '),
  ).filter((subject) => subject.score != null);
  let subjects = preferScoredSubjects(
    ownSubjects,
    uniqueSubjects([...parseSubjectEntries(localSubjectField), ...quotedScores]),
  );
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

export function hydrateEligibilityDecision(decision = {}, { eligibilityRules = [], documents = [], documentRequirements = [] } = {}) {
  if (decision.handler && decision.handler !== 'eligibility_screening') {
    return decision;
  }

  const fields = collectDecisionFields(decision);
  const seeded = seedAcademicDocuments(decision, documents, fields).map((doc) =>
    fillDocumentExtraction(doc, decision, fields),
  );
  const perDocument = evaluateEligibilityByDocument(seeded, eligibilityRules, documentRequirements);
  const profile = mergeEligibilityProfile(seeded, fields);
  const scoped = hasScopedDocumentEligibility(documentRequirements);
  const evaluation = scoped
    ? combinePerDocumentEvaluations(perDocument)
    : evaluateEligibilityRules(eligibilityRules, profile);
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
    verdict: !evaluation.eligible || hasUnchecked
      ? ELIGIBILITY_VERDICT.INELIGIBLE
      : ELIGIBILITY_VERDICT.ELIGIBLE,
  };
}

function findingNameKey(requirementName) {
  return String(requirementName ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Attach eligibility criteria and an eligible/ineligible verdict to each
 * document-verification finding. Photos and IDs are eligible when the file
 * itself is valid; academic files also have to meet the offering rules.
 */
export function hydrateDocumentVerificationDecision(
  decision = {},
  { eligibilityRules = [], documents = [], documentRequirements = [] } = {},
) {
  const authenticityDocs = asArray(decision.perDocument);
  const fields = collectDecisionFields(decision);
  const seededAcademic = seedAcademicDocuments(decision, documents, fields).map((doc) =>
    fillDocumentExtraction(doc, decision, fields),
  );
  const academicEvaluated = evaluateEligibilityByDocument(
    seededAcademic,
    eligibilityRules,
    documentRequirements,
  );
  const academicByName = new Map(
    academicEvaluated.map((doc) => [findingNameKey(doc.requirementName), doc]),
  );

  const sourceFindings = authenticityDocs.length ? authenticityDocs : seededAcademic;
  const perDocument = sourceFindings.map((finding) => {
    const academic = academicByName.get(findingNameKey(finding.requirementName));
    const isAcademic =
      Boolean(academic) || isAcademicEligibilityDocument(finding.requirementName, finding);
    const merged = academic
      ? {
          ...finding,
          qualification: finding.qualification || academic.qualification,
          aggregate: finding.aggregate ?? academic.aggregate,
          examScore: finding.examScore ?? academic.examScore,
          subjects: preferScoredSubjects(finding.subjects, academic.subjects),
          extractedFields: [
            ...asArray(finding.extractedFields),
            ...asArray(academic.extractedFields),
          ],
          eligibilityResult: academic.eligibilityResult,
        }
      : { ...finding, subjects: uniqueSubjects(finding.subjects) };

    const authenticityVerdict = ['pass', 'fail', 'uncertain'].includes(finding.authenticityVerdict)
      ? finding.authenticityVerdict
      : ['pass', 'fail', 'uncertain'].includes(finding.verdict)
        ? finding.verdict
        : 'pass';
    const eligibilityStatus = academic
      ? summarizeDocumentEvaluation(academic.eligibilityResult)
      : 'not_applicable';
    const eligibilityVerdict = documentEligibilityVerdict({
      finding: { ...merged, authenticityVerdict },
      eligibilityStatus,
      isAcademic,
    });

    return {
      ...merged,
      authenticityVerdict,
      eligibilityVerdict,
      verdict: eligibilityVerdict,
    };
  });

  const overallIneligible = perDocument.some(
    (doc) => doc.eligibilityVerdict === ELIGIBILITY_VERDICT.INELIGIBLE,
  );
  const profile = mergeEligibilityProfile(
    perDocument.filter((doc) => isAcademicEligibilityDocument(doc.requirementName, doc)),
    fields,
  );
  const scoped = hasScopedDocumentEligibility(documentRequirements);
  const evaluation = scoped
    ? combinePerDocumentEvaluations(academicEvaluated)
    : eligibilityRules.length
      ? evaluateEligibilityRules(eligibilityRules, profile)
      : { eligible: !overallIneligible, results: [] };
  const hasUnchecked = (evaluation.results ?? []).some((result) => result.status === 'unchecked');
  const eligible = !overallIneligible && evaluation.eligible !== false && !hasUnchecked;

  return {
    ...decision,
    perDocument,
    extractedFields: mergeExtractedFields(perDocument, fields),
    eligibilityResult: evaluation,
    verdict: eligible ? ELIGIBILITY_VERDICT.ELIGIBLE : ELIGIBILITY_VERDICT.INELIGIBLE,
    issues: (evaluation.results ?? [])
      .filter((result) => result.status === 'failed' || result.status === 'unchecked')
      .map((result) => result.message),
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
