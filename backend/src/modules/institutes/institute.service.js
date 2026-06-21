import { Institute } from './institute.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { ROLES } from '../../shared/constants/roles.js';
import { ensureEnrollmentServiceForInstitute } from '../enrollment/enrollment-seed.service.js';
import { setStudentPortalHost } from '../../shared/helpers/studentPortalInstitute.helper.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import {
  flushInstituteReadCache,
  flushStudentInstitutesCache,
} from '../../shared/helpers/cacheInvalidation.helper.js';

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
  await flushInstituteReadCache(instituteId);
  await flushStudentInstitutesCache();
  return institute;
}

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

  const hasHost = await Institute.exists({ isStudentPortalHost: true });
  if (!hasHost) {
    await setStudentPortalHost(instituteId);
  }

  await flushInstituteReadCache(instituteId);
  await flushStudentInstitutesCache();
  return institute;
}

/**
 * @param {string} instituteId
 * @param {string} userInstituteId
 */
export async function designateStudentPortalHost(instituteId, userInstituteId) {
  await getInstituteForUser(instituteId, userInstituteId);
  const result = await setStudentPortalHost(instituteId);
  await flushInstituteReadCache(instituteId);
  await flushStudentInstitutesCache();
  return result;
}

/**
 * @param {string} instituteId
 */
export async function getSetupSummary(instituteId, userInstituteId) {
  if (instituteId !== userInstituteId) {
    throw new AppError('You are not authorized to perform this action', 403);
  }

  return cachedRead(cacheNs.INSTITUTE_SETUP, [instituteId], async () => {
    const institute = await Institute.findById(instituteId);
    if (!institute) {
      throw new AppError('Institute not found', 404);
    }

    const staffCount = await User.countDocuments({
      instituteId,
      role: ROLES.STAFF,
      isActive: true,
    });

    return {
      institute,
      staffCount,
      setupCompleted: institute.setupCompleted,
      setupCompletedAt: institute.setupCompletedAt ?? null,
    };
  });
}
