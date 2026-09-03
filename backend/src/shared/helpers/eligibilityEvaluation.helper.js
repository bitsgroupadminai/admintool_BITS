import { RULE_FIELD_TYPE, RULE_OPERATOR } from '../enums/offering.enums.js';

export function normalizeFieldKey(field) {
  return String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

export function parseSubjectEntries(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item && typeof item === 'object' && item.name) {
        return [
          {
            name: String(item.name).trim(),
            score: parseNumericValue(item.score),
            maxScore: parseNumericValue(item.maxScore),
            grade: item.grade ? String(item.grade) : '',
          },
        ];
      }
      return parseSubjectEntries(item);
    });
  }

  const text = String(value ?? '').trim();
  if (!text) return [];

  return text
    .split(/[,;|]+/)
    .flatMap((part) => part.split(/\s+\/\s+/))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const scored = part.match(
        /^(.+?)\s*[:=\-]\s*(\d{1,3}(?:\.\d+)?)(?:\s*\/\s*(\d{2,3}))?(?:\s*[\(\[]?([A-D][1-3])[\)\]]?)?$/i,
      );
      if (scored) {
        return {
          name: scored[1].trim(),
          score: Number(scored[2]),
          maxScore: scored[3] ? Number(scored[3]) : null,
          grade: scored[4] ?? '',
        };
      }
      const trailing = part.match(/^(.+?)\s+(\d{1,3}(?:\.\d+)?)(?:\s*\/\s*(\d{2,3}))?(?:\s+([A-D][1-3]))?$/i);
      if (trailing && /[a-z]/i.test(trailing[1])) {
        return {
          name: trailing[1].trim(),
          score: Number(trailing[2]),
          maxScore: trailing[3] ? Number(trailing[3]) : null,
          grade: trailing[4] ?? '',
        };
      }
      const graded = part.match(/^(.+?)\s+([A-D][1-3])$/i);
      if (graded) {
        return { name: graded[1].trim(), score: null, maxScore: null, grade: graded[2] };
      }
      return { name: part, score: null, maxScore: null, grade: '' };
    });
}

export function inferQualificationLabel(text) {
  const tags = qualificationTags(text);
  if (tags.has('plus2')) return 'Class XII (10+2)';
  if (tags.has('class10')) return 'Class X';
  if (tags.has('bitsat')) return 'BITSAT';
  return '';
}

export function isClass12DocumentName(requirementName) {
  const name = String(requirementName ?? '').toLowerCase();
  return /class\s*12|12th|\bxii\b|10\s*\+\s*2|senior secondary|higher secondary/.test(name);
}

export function isClass10DocumentName(requirementName) {
  const name = String(requirementName ?? '').toLowerCase();
  return /class\s*10|10th|\bx\b|matric|secondary school/.test(name) && !isClass12DocumentName(name);
}

export function isBitsatDocumentName(requirementName) {
  return /bitsat|entrance/.test(String(requirementName ?? '').toLowerCase());
}

export function subjectsForDocument(subjects = [], requirementName) {
  if (!subjects.length) return [];
  if (isBitsatDocumentName(requirementName)) {
    return subjects.filter((subject) =>
      /physics|chemistry|math|english|logical|biology/.test(String(subject.name ?? '').toLowerCase()),
    );
  }
  const class10 = subjects.filter((subject) => isLikelyClass10Subject(subject.name));
  const class12 = subjects.filter((subject) => isLikelyClass12Subject(subject.name));
  if (isClass10DocumentName(requirementName)) {
    return class10.length ? class10 : subjects.filter((subject) => !isLikelyClass12Subject(subject.name));
  }
  if (isClass12DocumentName(requirementName)) {
    return class12.length ? class12 : subjects.filter((subject) => !isLikelyClass10Subject(subject.name));
  }
  return subjects;
}

function isLikelyClass10Subject(name) {
  const text = String(name ?? '').toLowerCase();
  return /language|literature|hindi course|mathematics standard|math standard|social science|^science$|information technology/.test(
    text,
  );
}

function isLikelyClass12Subject(name) {
  const text = String(name ?? '').toLowerCase();
  return /physics|chemistry|english core|physical education|computer science|^mathematics$|^maths$/.test(text);
}

function looksLikeQualificationField(key) {
  return /qualification|degree|education|10\s*\+\s*2/.test(key);
}

function looksLikeSubjectsField(key) {
  return /subject/.test(key) && !/threshold|mark|score/.test(key);
}

function looksLikeAggregateField(key) {
  return /aggregate|percentage|overall|total percent|cgpa/.test(key);
}

function looksLikeThresholdField(key) {
  return /threshold|minimum mark|min mark|subject mark/.test(key);
}

function looksLikeExamScoreField(key) {
  return /bitsat|entrance|exam score|test score/.test(key);
}

export function parseNumericValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const match = String(value)
    .replace(/,/g, '')
    .match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseList(value) {
  return String(value ?? '')
    .split(/[,;/|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function subjectTokens(name) {
  const text = String(name ?? '').toLowerCase();
  if (/math/.test(text)) return ['mathematics', 'maths', 'math'];
  if (/physics/.test(text)) return ['physics'];
  if (/chem/.test(text)) return ['chemistry', 'chem'];
  if (/english/.test(text)) return ['english'];
  if (/hindi/.test(text)) return ['hindi'];
  if (/\bit\b|information technology|computer/.test(text)) return ['information technology', 'computer science', 'it'];
  return text.split(/[^a-z0-9]+/).filter((part) => part.length > 2);
}

function listIncludesSubject(haystack, required) {
  const have = parseList(haystack);
  return subjectTokens(required).some((token) =>
    have.some((item) => item.includes(token) || token.includes(item.split(' ')[0])),
  );
}

function hasRequiredSubjects(actual, expected) {
  const needed = parseList(expected);
  if (!needed.length || actual == null || actual === '') return null;
  return needed.every((item) => listIncludesSubject(actual, item));
}

function qualificationTags(value) {
  const text = String(value ?? '').toLowerCase();
  const tags = new Set();
  if (/10\s*\+\s*2|\+2|class\s*12|12th|\bxii\b|senior secondary|higher secondary/.test(text)) {
    tags.add('plus2');
  }
  if ((/class\s*10|10th|\bx\b|matric/.test(text) || /secondary school/.test(text)) && !/12|xii|senior|higher/.test(text)) {
    tags.add('class10');
  }
  if (/bitsat/.test(text)) tags.add('bitsat');
  if (/graduate|bachelor|degree/.test(text)) tags.add('degree');
  return tags;
}

function qualificationMatches(actual, expected) {
  if (actual == null || actual === '') return null;
  const actualTags = qualificationTags(actual);
  const expectedTags = qualificationTags(expected);
  if (expectedTags.size && actualTags.size) {
    for (const tag of expectedTags) {
      if (actualTags.has(tag)) return true;
    }
    if (expectedTags.has('plus2') && actualTags.has('class10')) return false;
    return false;
  }
  const actualText = String(actual).toLowerCase();
  const expectedText = String(expected).toLowerCase();
  return actualText.includes(expectedText) || expectedText.includes(actualText);
}

function resolveStudentValue(field, profile) {
  const key = normalizeFieldKey(field);

  if (['programme', 'program', 'course', 'enrolled programme', 'enrollment programme'].includes(key)) {
    return profile.programmeName ?? profile.customFields?.[key] ?? null;
  }

  if (['enrollment status', 'enrollment', 'student status'].includes(key)) {
    return profile.enrollmentStatus ?? profile.customFields?.[key] ?? null;
  }

  if (looksLikeQualificationField(key)) {
    return (
      profile.qualification ||
      profile.customFields?.[key] ||
      profile.customFields?.qualification ||
      inferQualificationLabel(profile.evidenceText) ||
      null
    );
  }

  if (looksLikeAggregateField(key)) {
    return (
      profile.aggregate ??
      profile.customFields?.[key] ??
      profile.customFields?.aggregate ??
      profile.customFields?.percentage ??
      null
    );
  }

  if (looksLikeExamScoreField(key)) {
    return profile.examScore ?? profile.customFields?.[key] ?? profile.customFields?.bitsat ?? null;
  }

  if (looksLikeSubjectsField(key)) {
    if (profile.customFields?.[key] != null) return profile.customFields[key];
    if (profile.subjects?.length) {
      return profile.subjects.map((subject) => subject.name).join(', ');
    }
    return null;
  }

  if (profile.customFields?.[key] != null) {
    return profile.customFields[key];
  }

  return null;
}

function formatDisplayValue(value) {
  if (value == null || value === '') return 'not found';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function describeEligibilityRequirement(operator, expected) {
  const display = formatDisplayValue(expected);
  if (operator === RULE_OPERATOR.GTE) return `at least ${display}`;
  if (operator === RULE_OPERATOR.LTE) return `at most ${display}`;
  if (operator === RULE_OPERATOR.GT) return `more than ${display}`;
  if (operator === RULE_OPERATOR.LT) return `less than ${display}`;
  if (operator === RULE_OPERATOR.NEQ) return `a value other than ${display}`;
  return display;
}

export function isAcademicEligibilityDocument(requirementName, doc = {}) {
  if ((doc.subjects ?? []).length || doc.aggregate != null || doc.examScore != null || doc.qualification) {
    return true;
  }
  const name = String(requirementName ?? '').toLowerCase();
  if (/photo|photograph|signature|aadhaar|aadhar|id proof|passport-size|identity/.test(name)) {
    return false;
  }
  return /marksheet|marks sheet|scorecard|bitsat|class\s*10|class\s*12|10th|12th|10\s*\+\s*2|certificate|senior secondary|secondary school/.test(
    name,
  );
}

export function ruleAppliesToDocument(rule, requirementName) {
  const name = String(requirementName ?? '').toLowerCase();
  if (/photo|photograph|signature|aadhaar|aadhar|id proof|passport-size/.test(name)) {
    return false;
  }

  const field = normalizeFieldKey(rule.field);
  const expected = String(rule.value ?? '').toLowerCase();

  if (looksLikeExamScoreField(field) || /bitsat/.test(expected)) {
    return /bitsat|scorecard|entrance/.test(name);
  }

  if (looksLikeQualificationField(field) && qualificationTags(expected).has('plus2')) {
    return isClass12DocumentName(name) || /12|xii|\+2|senior/.test(name);
  }

  if (looksLikeQualificationField(field) && qualificationTags(expected).has('class10')) {
    return /class\s*10|\bx\b/.test(name) && !/12|xii/.test(name);
  }

  if (looksLikeAggregateField(field) && /bitsat|entrance/.test(name) && !/marksheet|class\s*1[02]|12|xii/.test(name)) {
    return false;
  }

  if (looksLikeSubjectsField(field) && !looksLikeThresholdField(field)) {
    return /12|xii|\+2|senior|graduation|degree/.test(name);
  }

  return isAcademicEligibilityDocument(name);
}

function compareValues(actual, operator, expected, fieldType, fieldKey) {
  if (actual == null || actual === '') {
    return null;
  }

  if (fieldType === RULE_FIELD_TYPE.BOOLEAN) {
    const actualBool = Boolean(actual);
    const expectedBool = Boolean(expected);
    if (operator === RULE_OPERATOR.EQ) return actualBool === expectedBool;
    if (operator === RULE_OPERATOR.NEQ) return actualBool !== expectedBool;
    return null;
  }

  if (fieldType === RULE_FIELD_TYPE.NUMERIC || looksLikeAggregateField(fieldKey) || looksLikeExamScoreField(fieldKey)) {
    const actualNumber = parseNumericValue(actual);
    const expectedNumber = parseNumericValue(expected);
    if (actualNumber == null || expectedNumber == null) {
      return null;
    }
    if (operator === RULE_OPERATOR.EQ) return actualNumber === expectedNumber;
    if (operator === RULE_OPERATOR.NEQ) return actualNumber !== expectedNumber;
    if (operator === RULE_OPERATOR.GTE) return actualNumber >= expectedNumber;
    if (operator === RULE_OPERATOR.LTE) return actualNumber <= expectedNumber;
    if (operator === RULE_OPERATOR.GT) return actualNumber > expectedNumber;
    if (operator === RULE_OPERATOR.LT) return actualNumber < expectedNumber;
    return actualNumber >= expectedNumber;
  }

  if (looksLikeSubjectsField(fieldKey) && (operator === RULE_OPERATOR.EQ || !operator)) {
    return hasRequiredSubjects(actual, expected);
  }

  if (looksLikeQualificationField(fieldKey) && (operator === RULE_OPERATOR.EQ || !operator)) {
    return qualificationMatches(actual, expected);
  }

  const actualText = String(actual).trim().toLowerCase();
  const expectedText = String(expected).trim().toLowerCase();
  if (operator === RULE_OPERATOR.EQ) return actualText === expectedText || actualText.includes(expectedText);
  if (operator === RULE_OPERATOR.NEQ) return actualText !== expectedText;
  return null;
}

function buildScoreChecks(rule, profile) {
  const required = parseNumericValue(rule.value);
  if (required == null || !profile.subjects?.length) return [];

  const needed = parseList(profile.requiredSubjects);
  const candidates = needed.length
    ? profile.subjects.filter((subject) => needed.some((item) => listIncludesSubject(subject.name, item)))
    : profile.subjects;

  return candidates
    .map((subject) => {
      const score = parseNumericValue(subject.score);
      if (score == null) return null;
      return {
        name: subject.name,
        score,
        grade: subject.grade ?? '',
        required,
        status: score >= required ? 'passed' : 'failed',
      };
    })
    .filter(Boolean);
}

export function evaluateEligibilityRules(rules = [], profile = {}, options = {}) {
  const results = [];
  const failures = [];
  const subjectsRule = rules.find((rule) => looksLikeSubjectsField(normalizeFieldKey(rule.field)));
  const workingProfile = {
    ...profile,
    requiredSubjects: profile.requiredSubjects ?? subjectsRule?.value,
  };

  for (const rule of rules) {
    const fieldKey = normalizeFieldKey(rule.field);
    const requirement = describeEligibilityRequirement(rule.operator, rule.value);

    if (options.requirementName && !ruleAppliesToDocument(rule, options.requirementName)) {
      results.push({
        field: rule.field,
        status: 'not_applicable',
        actual: null,
        expected: rule.value,
        operator: rule.operator,
        requirement,
        scoreChecks: [],
        message: `${rule.field} is not checked on this document.`,
      });
      continue;
    }

    if (looksLikeThresholdField(fieldKey)) {
      const scoreChecks = buildScoreChecks(rule, workingProfile);
      if (!scoreChecks.length) {
        results.push({
          field: rule.field,
          status: 'unchecked',
          actual: null,
          expected: rule.value,
          operator: rule.operator,
          requirement,
          scoreChecks: [],
          message: `${rule.field} requires ${requirement}, but subject scores could not be read from this document.`,
        });
        continue;
      }
      const failed = scoreChecks.filter((item) => item.status === 'failed');
      if (failed.length) {
        failures.push(rule.field);
      }
      results.push({
        field: rule.field,
        status: failed.length ? 'failed' : 'passed',
        actual: scoreChecks.map((item) => `${item.name} ${item.score}`).join(', '),
        expected: rule.value,
        operator: rule.operator,
        requirement,
        scoreChecks,
        message: failed.length
          ? `${rule.field} requires ${requirement}. Below threshold: ${failed.map((item) => `${item.name} ${item.score}`).join(', ')}.`
          : `${rule.field} requires ${requirement}; all checked subject scores meet it.`,
      });
      continue;
    }

    const actual = resolveStudentValue(rule.field, workingProfile);
    const passed = compareValues(actual, rule.operator, rule.value, rule.fieldType, fieldKey);

    if (passed === null) {
      results.push({
        field: rule.field,
        status: 'unchecked',
        actual,
        expected: rule.value,
        operator: rule.operator,
        requirement,
        scoreChecks: [],
        message: `${rule.field} requires ${requirement}, but this value could not be confirmed from the available information.`,
      });
      continue;
    }

    if (passed) {
      results.push({
        field: rule.field,
        status: 'passed',
        actual,
        expected: rule.value,
        operator: rule.operator,
        requirement,
        scoreChecks: [],
        message: `${rule.field} requires ${requirement}; the value found is ${formatDisplayValue(actual)}.`,
      });
      continue;
    }

    failures.push(rule.field);
    results.push({
      field: rule.field,
      status: 'failed',
      actual,
      expected: rule.value,
      operator: rule.operator,
      requirement,
      scoreChecks: [],
      message: `${rule.field} requires ${requirement}, but the value found is ${formatDisplayValue(actual)}. This does not meet the eligibility criterion.`,
    });
  }

  return {
    eligible: failures.length === 0,
    failures,
    results,
  };
}

export function buildStudentEligibilityProfile(user = {}) {
  return {
    programmeName: user.enrolledProgrammeName ?? user.enrolledProgramme?.name ?? null,
    enrollmentStatus: user.enrollmentStatus ?? null,
    qualification: null,
    customFields: {},
    subjects: [],
  };
}
