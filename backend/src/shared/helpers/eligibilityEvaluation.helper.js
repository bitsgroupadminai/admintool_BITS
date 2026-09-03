import { RULE_FIELD_TYPE, RULE_OPERATOR } from '../enums/offering.enums.js';

function normalizeFieldKey(field) {
  return String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function resolveStudentValue(field, profile) {
  const key = normalizeFieldKey(field);

  if (['programme', 'program', 'course', 'enrolled programme', 'enrollment programme'].includes(key)) {
    return profile.programmeName ?? null;
  }

  if (['enrollment status', 'enrollment', 'student status'].includes(key)) {
    return profile.enrollmentStatus ?? null;
  }

  if (['qualification', 'degree', 'education'].includes(key)) {
    return profile.qualification ?? null;
  }

  if (profile.customFields?.[key] != null) {
    return profile.customFields[key];
  }

  return null;
}

function formatDisplayValue(value) {
  if (value == null) return 'not found';
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

function compareValues(actual, operator, expected, fieldType) {
  if (actual == null) {
    return null;
  }

  if (fieldType === RULE_FIELD_TYPE.BOOLEAN) {
    const actualBool = Boolean(actual);
    const expectedBool = Boolean(expected);
    if (operator === RULE_OPERATOR.EQ) return actualBool === expectedBool;
    if (operator === RULE_OPERATOR.NEQ) return actualBool !== expectedBool;
    return null;
  }

  if (fieldType === RULE_FIELD_TYPE.NUMERIC) {
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    if (Number.isNaN(actualNumber) || Number.isNaN(expectedNumber)) {
      return null;
    }
    if (operator === RULE_OPERATOR.EQ) return actualNumber === expectedNumber;
    if (operator === RULE_OPERATOR.NEQ) return actualNumber !== expectedNumber;
    if (operator === RULE_OPERATOR.GTE) return actualNumber >= expectedNumber;
    if (operator === RULE_OPERATOR.LTE) return actualNumber <= expectedNumber;
    if (operator === RULE_OPERATOR.GT) return actualNumber > expectedNumber;
    if (operator === RULE_OPERATOR.LT) return actualNumber < expectedNumber;
    return null;
  }

  const actualText = String(actual).trim().toLowerCase();
  const expectedText = String(expected).trim().toLowerCase();
  if (operator === RULE_OPERATOR.EQ) return actualText === expectedText;
  if (operator === RULE_OPERATOR.NEQ) return actualText !== expectedText;
  return null;
}

export function evaluateEligibilityRules(rules = [], profile = {}) {
  const results = [];
  const failures = [];

  for (const rule of rules) {
    const actual = resolveStudentValue(rule.field, profile);
    const passed = compareValues(actual, rule.operator, rule.value, rule.fieldType);

    const requirement = describeEligibilityRequirement(rule.operator, rule.value);

    if (passed === null) {
      results.push({
        field: rule.field,
        status: 'unchecked',
        actual,
        expected: rule.value,
        operator: rule.operator,
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
  };
}
