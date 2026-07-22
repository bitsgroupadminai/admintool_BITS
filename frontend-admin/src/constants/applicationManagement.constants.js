export const APPLICATION_STATUS_OPTIONS = [
  { value: '', label: 'Needs review' },
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'Under review' },
  { value: 'pending_ai_review', label: 'Pending AI review' },
  { value: 'needs_correction', label: 'Needs correction' },
  { value: 'admitted', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' },
];

export const APPLICATION_PAGE_SIZE_OPTIONS = [10, 20, 50];

export const APPLICATION_SLA_FILTER_OPTIONS = [
  { value: '', label: 'All SLA states' },
  { value: 'true', label: 'SLA breached only' },
];

export const APPLICATION_STATUS_LABELS = {
  draft: 'Draft',
  pending_authorization: 'Awaiting authorization',
  submitted: 'Submitted',
  in_review: 'Under review',
  pending_ai_review: 'Pending AI review',
  needs_correction: 'Needs correction',
  admitted: 'Approved',
  rejected: 'Rejected',
};

export const APPLICATION_STATUS_BADGE_VARIANT = {
  draft: 'draft',
  pending_authorization: 'incomplete',
  submitted: 'incomplete',
  in_review: 'default',
  pending_ai_review: 'incomplete',
  needs_correction: 'incomplete',
  admitted: 'active',
  rejected: 'disabled',
};

export function getApplicationStatusActions(status) {
  switch (status) {
    case 'submitted':
      return [
        { status: 'in_review', label: 'Mark under review' },
        { status: 'admitted', label: 'Approve request' },
        { status: 'rejected', label: 'Reject request' },
      ];
    case 'in_review':
      return [
        { status: 'admitted', label: 'Approve request' },
        { status: 'rejected', label: 'Reject request' },
      ];
    default:
      return [];
  }
}

export const WORKFLOW_OUTCOME_LABELS = {
  approved: 'Approve step',
  rejected: 'Reject request',
  needs_correction: 'Request correction',
};
