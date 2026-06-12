import { Institute } from '../../modules/institutes/institute.model.js';
import { isPredefinedStaffRole } from '../constants/roles.js';
import { AppError } from '../../core/utils/AppError.js';

/**
 * Validate staff role and persist custom roles on the institute.
 * @param {string} instituteId
 * @param {string} staffRole
 */
export async function resolveStaffRole(instituteId, staffRole) {
  const normalized = staffRole.trim();
  if (!normalized) {
    throw new AppError('Role is required', 400);
  }

  if (isPredefinedStaffRole(normalized)) {
    return normalized;
  }

  await Institute.findByIdAndUpdate(instituteId, {
    $addToSet: { customStaffRoles: normalized },
  });

  return normalized;
}

/**
 * @param {string} instituteId
 */
export async function getStaffRolesForInstitute(instituteId) {
  const institute = await Institute.findById(instituteId).select('customStaffRoles');
  return institute?.customStaffRoles ?? [];
}
