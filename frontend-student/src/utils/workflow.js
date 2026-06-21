export const HANDLER_TYPE = {
  STAFF: 'staff',
  STUDENT: 'student',
  AI: 'ai',
};

const AI_LABELS = {
  document_verification: 'Automatic document check',
  eligibility_screening: 'Automatic eligibility check',
  template_validation: 'Automatic format check',
};

const STAFF_LABELS = {
  document_verifier: 'Document review team',
  approver: 'Approval team',
  counter_staff: 'Help desk',
  general: 'Institute staff',
};

export function getHandlerLabel(handledBy) {
  if (!handledBy) return 'Institute team';
  if (handledBy.type === HANDLER_TYPE.STUDENT) return 'You';
  if (handledBy.type === HANDLER_TYPE.AI) {
    return AI_LABELS[handledBy.assignee] ?? 'Automatic check';
  }
  return STAFF_LABELS[handledBy.assignee] ?? 'Institute staff';
}
