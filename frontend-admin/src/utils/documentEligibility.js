export function emptyDocumentEligibility() {
  return {
    enabled: false,
    qualification: '',
    aggregateMin: '',
    subjectThreshold: '',
    requiredSubjects: [],
  };
}

export function isAcademicDocumentName(name) {
  const text = String(name ?? '').toLowerCase();
  if (/photo|photograph|signature|aadhaar|aadhar|id proof|passport-size|identity/.test(text)) {
    return /marksheet|scorecard|bitsat/.test(text);
  }
  return /marksheet|scorecard|bitsat|class\s*10|class\s*12|10th|12th|10\s*\+\s*2|certificate|senior secondary/.test(
    text,
  );
}

export function defaultDocumentEligibility(name) {
  return {
    ...emptyDocumentEligibility(),
    enabled: isAcademicDocumentName(name),
  };
}

export function normalizeDocumentEligibility(eligibility, documentName = '') {
  if (!eligibility || typeof eligibility !== 'object') {
    return defaultDocumentEligibility(documentName);
  }
  return {
    enabled: Boolean(eligibility.enabled),
    qualification: eligibility.qualification ?? '',
    aggregateMin: eligibility.aggregateMin ?? '',
    subjectThreshold: eligibility.subjectThreshold ?? '',
    requiredSubjects: (eligibility.requiredSubjects ?? []).map((subject) => ({
      name: subject?.name ?? '',
      minScore: subject?.minScore ?? '',
    })),
  };
}

export function documentHasEligibilityCriteria(eligibility) {
  if (!eligibility?.enabled) return false;
  if (String(eligibility.qualification ?? '').trim()) return true;
  if (eligibility.aggregateMin !== '' && eligibility.aggregateMin != null) return true;
  if (eligibility.subjectThreshold !== '' && eligibility.subjectThreshold != null) return true;
  return (eligibility.requiredSubjects ?? []).some((subject) => String(subject?.name ?? '').trim());
}

export function rulesFromDocumentEligibility(eligibility) {
  if (!eligibility?.enabled) return [];
  const rules = [];
  const qualification = String(eligibility.qualification ?? '').trim();
  if (qualification) {
    rules.push({ field: 'Qualification', fieldType: 'text', operator: 'eq', value: qualification });
  }
  const subjects = (eligibility.requiredSubjects ?? [])
    .map((subject) => String(subject?.name ?? '').trim())
    .filter(Boolean);
  if (subjects.length) {
    rules.push({ field: 'Subjects', fieldType: 'text', operator: 'eq', value: subjects.join(', ') });
  }
  if (eligibility.aggregateMin !== '' && eligibility.aggregateMin != null) {
    rules.push({
      field: 'Aggregate Requirement',
      fieldType: 'numeric',
      operator: 'gte',
      value: Number(eligibility.aggregateMin),
    });
  }
  if (eligibility.subjectThreshold !== '' && eligibility.subjectThreshold != null) {
    rules.push({
      field: 'Subject Threshold',
      fieldType: 'numeric',
      operator: 'gte',
      value: Number(eligibility.subjectThreshold),
    });
  }
  return rules;
}

export function eligibilityPayload(eligibility) {
  const requiredSubjects = (eligibility?.requiredSubjects ?? [])
    .map((subject) => ({
      name: String(subject?.name ?? '').trim(),
      minScore:
        subject?.minScore === '' || subject?.minScore == null ? null : Number(subject.minScore),
    }))
    .filter((subject) => subject.name);

  return {
    enabled: Boolean(eligibility?.enabled),
    qualification: String(eligibility?.qualification ?? '').trim(),
    aggregateMin:
      eligibility?.aggregateMin === '' || eligibility?.aggregateMin == null
        ? null
        : Number(eligibility.aggregateMin),
    subjectThreshold:
      eligibility?.subjectThreshold === '' || eligibility?.subjectThreshold == null
        ? null
        : Number(eligibility.subjectThreshold),
    requiredSubjects,
  };
}
