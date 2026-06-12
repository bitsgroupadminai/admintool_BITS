export const OFFERING_STATUS = {
  DRAFT: 'draft',
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  EXPIRED: 'expired',
  ARCHIVED: 'archived',
};

export const QUEUE_MODE = {
  QUEUE_ONLY: 'queue_only',
  APPOINTMENT_ONLY: 'appointment_only',
  HYBRID: 'hybrid',
};

export const RULE_FIELD_TYPE = {
  NUMERIC: 'numeric',
  TEXT: 'text',
  BOOLEAN: 'boolean',
};

export const RULE_OPERATOR = {
  EQ: 'eq',
  NEQ: 'neq',
  GTE: 'gte',
  LTE: 'lte',
  GT: 'gt',
  LT: 'lt',
};

export const SLA_UNIT = {
  MINUTES: 'minutes',
  HOURS: 'hours',
  DAYS: 'days',
};

export const WORKFLOW_ACTION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_CORRECTION: 'request_correction',
};

export const DOCUMENT_FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png'];
