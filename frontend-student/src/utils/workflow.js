export const HANDLER_TYPE = {
  STAFF: 'staff',
  STUDENT: 'student',
  AI: 'ai',
};

export const AI_HANDLERS = [
  { value: 'document_verification', label: 'AI — Document verification' },
  { value: 'eligibility_screening', label: 'AI — Eligibility screening' },
  { value: 'template_validation', label: 'AI — Template validation' },
];

export function getHandlerLabel(handledBy) {
  if (!handledBy) return '—';
  if (handledBy.type === HANDLER_TYPE.STUDENT) return 'Student';
  if (handledBy.type === HANDLER_TYPE.AI) {
    return AI_HANDLERS.find((h) => h.value === handledBy.assignee)?.label ?? 'AI';
  }
  const staffLabels = {
    document_verifier: 'Document Verifier',
    approver: 'Approver',
    counter_staff: 'Counter Staff',
    general: 'General Staff',
  };
  return staffLabels[handledBy.assignee] ?? handledBy.assignee;
}
