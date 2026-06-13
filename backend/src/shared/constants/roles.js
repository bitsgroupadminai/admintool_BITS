export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  STUDENT: 'student',
};

export const STAFF_ROLES = [
  { value: 'document_verifier', label: 'Document Verifier' },
  { value: 'approver', label: 'Approver' },
  { value: 'counter_staff', label: 'Counter Staff' },
  { value: 'general', label: 'General Staff' },
];

export const CUSTOM_ROLE_OPTION_VALUE = '__custom__';

/**
 * @param {string} role
 */
export function isPredefinedStaffRole(role) {
  return STAFF_ROLES.some((r) => r.value === role);
}

/**
 * @param {string} role
 */
export function getStaffRoleLabel(role) {
  const predefined = STAFF_ROLES.find((r) => r.value === role);
  return predefined?.label ?? role;
}
