import { Institute } from './institute.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { ROLES } from '../../shared/constants/roles.js';

/**
 * @param {string} instituteId
 */
export async function getInstituteForUser(instituteId, userInstituteId) {
  if (instituteId !== userInstituteId) {
    throw new AppError('You are not authorized to perform this action', 403);
  }
  const institute = await Institute.findById(instituteId);
  if (!institute) {
    throw new AppError('Institute not found', 404);
  }
  return institute;
}

/**
 * @param {string} instituteId
 * @param {{ name: string }} payload
 */
export async function updateInstitute(instituteId, userInstituteId, payload) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  institute.name = payload.name;
  await institute.save();
  return institute;
}

import { ensureEnrollmentServiceForInstitute } from '../enrollment/enrollment-seed.service.js';

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 */
export async function completeSetup(instituteId, userInstituteId) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  const adminCount = await User.countDocuments({
    instituteId,
    role: ROLES.ADMIN,
    isActive: true,
  });

  if (adminCount < 1) {
    throw new AppError('At least one admin must exist', 400);
  }

  institute.setupCompleted = true;
  institute.setupCompletedAt = new Date();
  await institute.save();
  await ensureEnrollmentServiceForInstitute(instituteId);
  return institute;
}

/**
 * @param {string} instituteId
 */
export async function getSetupSummary(instituteId, userInstituteId) {
  const institute = await getInstituteForUser(instituteId, userInstituteId);
  const staffCount = await User.countDocuments({
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  });

  return {
    institute: {
      id: institute._id.toString(),
      name: institute.name,
      setupCompleted: institute.setupCompleted,
    },
    staffCount,
  };
}
