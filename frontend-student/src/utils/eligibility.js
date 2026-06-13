const OPERATOR_LABELS = {
  eq: 'must be',
  neq: 'must not be',
  gte: 'at least',
  lte: 'at most',
  gt: 'more than',
  lt: 'less than',
};

/**
 * @param {{ field: string, fieldType: string, operator: string, value: unknown }} rule
 */
export function formatEligibilityRule(rule) {
  const field = rule.field?.trim() ?? 'Requirement';
  const operator = OPERATOR_LABELS[rule.operator] ?? rule.operator;
  const value = formatRuleValue(rule.value, rule.fieldType);

  if (rule.operator === 'eq' && rule.fieldType === 'text') {
    return `You must have: ${value}`;
  }

  if (rule.fieldType === 'boolean') {
    return value === 'Yes' ? `You must meet: ${field}` : `You must not have: ${field}`;
  }

  if (rule.fieldType === 'numeric') {
    return `${field}: ${operator} ${value}`;
  }

  return `${field} ${operator} ${value}`;
}

/**
 * @param {unknown} value
 * @param {string} fieldType
 */
function formatRuleValue(value, fieldType) {
  if (fieldType === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (fieldType === 'numeric' && typeof value === 'number') {
    return `${value}%`;
  }
  return String(value);
}
