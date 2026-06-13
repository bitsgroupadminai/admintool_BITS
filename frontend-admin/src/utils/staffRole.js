const PREDEFINED_LABELS = {
  document_verifier: 'Document Verifier',
  approver: 'Approver',
  counter_staff: 'Counter Staff',
  general: 'General Staff',
};

/**
 * @param {string} role
 */
export function getStaffRoleLabel(role) {
  return PREDEFINED_LABELS[role] ?? role;
}

export const CUSTOM_ROLE_VALUE = '__custom__';
