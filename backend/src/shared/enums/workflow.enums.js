export const HANDLER_TYPE = {
  STAFF: 'staff',
  STUDENT: 'student',
  AI: 'ai',
};

export const AI_HANDLER = {
  DOCUMENT_VERIFICATION: 'document_verification',
  ELIGIBILITY_SCREENING: 'eligibility_screening',
  TEMPLATE_VALIDATION: 'template_validation',
};

export const OUTCOME_TYPE = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_CORRECTION: 'needs_correction',
};

export const ROUTE_ACTION = {
  NEXT_STEP: 'next_step',
  END_WORKFLOW: 'end_workflow',
  RETURN_TO_STUDENT: 'return_to_student',
};

export const TERMINAL_STATE = {
  COMPLETED: 'completed',
  REJECTED: 'rejected',
};
