import {
  isAcademicEligibilityDocument,
  normalizeFieldKey,
  parseNumericValue,
} from './eligibilityEvaluation.helper.js';

export function emptyDocumentEligibility() {
  return {
    enabled: false,
    qualification: '',
    aggregateMin: null,
    subjectThreshold: null,
    requiredSubjects: [],
  };
}

export function defaultDocumentEligibility(name) {
  return {
    ...emptyDocumentEligibility(),
    enabled: isAcademicEligibilityDocument(name),
  };
}

export function normalizeDocumentEligibility(eligibility) {
  if (!eligibility || typeof eligibility !== 'object') {
    return emptyDocumentEligibility();
  }

  return {
    enabled: Boolean(eligibility.enabled),
    qualification: '',
    aggregateMin: parseNumericValue(eligibility.aggregateMin),
    subjectThreshold: parseNumericValue(eligibility.subjectThreshold),
    requiredSubjects: (eligibility.requiredSubjects ?? [])
      .map((subject) => ({
        name: String(subject?.name ?? subject ?? '').trim(),
        minScore: parseNumericValue(subject?.minScore),
      }))
      .filter((subject) => subject.name),
  };
}

export function documentHasEligibilityCriteria(eligibility) {
  const normalized = normalizeDocumentEligibility(eligibility);
  if (!normalized.enabled) return false;
  return Boolean(
    normalized.aggregateMin != null ||
      normalized.subjectThreshold != null ||
      normalized.requiredSubjects.length,
  );
}

export function requiredSubjectsMissingThreshold(eligibility) {
  const normalized = normalizeDocumentEligibility(eligibility);
  if (!normalized.enabled || !normalized.requiredSubjects.length) return false;
  const allHaveMin = normalized.requiredSubjects.every((subject) => subject.minScore != null);
  return normalized.subjectThreshold == null && !allHaveMin;
}

export function rulesFromDocumentEligibility(eligibility) {
  const normalized = normalizeDocumentEligibility(eligibility);
  if (!normalized.enabled) return [];

  const rules = [];
  if (normalized.requiredSubjects.length) {
    rules.push({
      field: 'Subjects',
      fieldType: 'text',
      operator: 'eq',
      value: normalized.requiredSubjects.map((subject) => subject.name).join(', '),
    });
  }
  if (normalized.aggregateMin != null) {
    rules.push({
      field: 'Aggregate Requirement',
      fieldType: 'numeric',
      operator: 'gte',
      value: normalized.aggregateMin,
    });
  }
  if (normalized.subjectThreshold != null || normalized.requiredSubjects.some((subject) => subject.minScore != null)) {
    rules.push({
      field: 'Subject Threshold',
      fieldType: 'numeric',
      operator: 'gte',
      value: normalized.subjectThreshold ?? Math.min(
        ...normalized.requiredSubjects.map((subject) => subject.minScore).filter((value) => value != null),
      ),
    });
  }
  return rules.filter((rule) => rule.value != null && rule.value !== '' && !Number.isNaN(rule.value));
}

export function subjectThresholdsFromEligibility(eligibility) {
  const normalized = normalizeDocumentEligibility(eligibility);
  const thresholds = {};
  for (const subject of normalized.requiredSubjects) {
    if (subject.minScore != null) {
      thresholds[normalizeFieldKey(subject.name)] = subject.minScore;
    }
  }
  return thresholds;
}

export function flattenDocumentEligibility(documentRequirements = []) {
  const seen = new Set();
  const rules = [];
  for (const requirement of documentRequirements) {
    for (const rule of rulesFromDocumentEligibility(requirement?.eligibility)) {
      const key = `${rule.field}|${rule.operator}|${JSON.stringify(rule.value)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rules.push(rule);
    }
  }
  return rules;
}

export function hasScopedDocumentEligibility(documentRequirements = []) {
  return (documentRequirements ?? []).some((requirement) =>
    documentHasEligibilityCriteria(requirement?.eligibility),
  );
}

export function rulesForDocument(requirement, fallbackRules = []) {
  const scoped = rulesFromDocumentEligibility(requirement?.eligibility);
  if (scoped.length) {
    return { rules: scoped, scoped: true, eligibility: normalizeDocumentEligibility(requirement.eligibility) };
  }
  if (requirement?.eligibility && requirement.eligibility.enabled === false) {
    return { rules: [], scoped: true, eligibility: normalizeDocumentEligibility(requirement.eligibility) };
  }
  return { rules: fallbackRules ?? [], scoped: false, eligibility: null };
}

export function formatDocumentEligibility(eligibility) {
  const normalized = normalizeDocumentEligibility(eligibility);
  return {
    enabled: normalized.enabled,
    qualification: normalized.qualification,
    aggregateMin: normalized.aggregateMin,
    subjectThreshold: normalized.subjectThreshold,
    requiredSubjects: normalized.requiredSubjects,
  };
}

export function describeDocumentEligibility(eligibility) {
  const rules = rulesFromDocumentEligibility(eligibility);
  const normalized = normalizeDocumentEligibility(eligibility);
  const notes = [];
  for (const rule of rules) {
    if (rule.field === 'Subjects') notes.push(`Required subjects: ${rule.value}`);
    else if (rule.field === 'Aggregate Requirement') notes.push(`Minimum overall score: ${rule.value}`);
    else if (rule.field === 'Subject Threshold') notes.push(`Minimum score in each subject: ${rule.value}`);
  }
  for (const subject of normalized.requiredSubjects) {
    if (subject.minScore != null) {
      notes.push(`${subject.name}: at least ${subject.minScore}`);
    }
  }
  return [...new Set(notes)];
}

export function eligibilityFromGenericRules(rules = []) {
  const eligibility = {
    ...emptyDocumentEligibility(),
    enabled: true,
  };

  for (const rule of rules) {
    const key = normalizeFieldKey(rule.field);
    if (/subject/.test(key) && !/threshold|mark|score/.test(key)) {
      continue;
    }
    if (/qualification|degree|education/.test(key) && !/subject/.test(key)) {
      continue;
    }
    if (/aggregate|percentage|overall|total percent|cgpa/.test(key)) {
      eligibility.aggregateMin = parseNumericValue(rule.value);
      continue;
    }
    if (/threshold|minimum mark|min mark|subject mark/.test(key)) {
      eligibility.subjectThreshold = parseNumericValue(rule.value);
    }
  }

  return eligibility;
}

export function applyEligibilityTemplateToDocuments(documentRequirements = [], template) {
  if (!template || !documentHasEligibilityCriteria(template)) {
    return documentRequirements;
  }

  return documentRequirements.map((requirement) => {
    const current = requirement.eligibility;
    if (documentHasEligibilityCriteria(current)) return requirement;
    if (!isAcademicEligibilityDocument(requirement.name)) return requirement;
    return {
      ...(typeof requirement.toObject === 'function' ? requirement.toObject() : requirement),
      eligibility: {
        ...emptyDocumentEligibility(),
        enabled: true,
        aggregateMin: template.aggregateMin ?? current?.aggregateMin ?? null,
        subjectThreshold: template.subjectThreshold ?? current?.subjectThreshold ?? null,
        requiredSubjects: normalizeDocumentEligibility(current).requiredSubjects,
      },
    };
  });
}

export function offeringHasEligibilityConfigured(offering) {
  const documents = offering?.documentRequirements ?? [];
  const checking = documents.filter((requirement) => requirement?.eligibility?.enabled);
  if (checking.length) {
    return checking.every((requirement) => documentHasEligibilityCriteria(requirement.eligibility));
  }
  if (hasScopedDocumentEligibility(documents)) return true;
  if (offering?.eligibilityRules?.length) return true;
  const academic = documents.filter((requirement) => isAcademicEligibilityDocument(requirement.name));
  return academic.length === 0 && documents.length > 0;
}
