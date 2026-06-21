import { Institute } from '../../modules/institutes/institute.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';

/**
 * Resolves which institute receives public student-portal enrollment submissions.
 * Priority: env STUDENT_PORTAL_INSTITUTE_ID → isStudentPortalHost → oldest setup-complete institute.
 */
export async function resolveStudentPortalInstituteId() {
  if (env.STUDENT_PORTAL_INSTITUTE_ID) {
    const institute = await Institute.findById(env.STUDENT_PORTAL_INSTITUTE_ID);
    if (!institute) {
      throw new AppError('Student portal institute not found', 500);
    }
    return institute._id.toString();
  }

  const hostInstitute = await Institute.findOne({ isStudentPortalHost: true }).sort({ createdAt: 1 });
  if (hostInstitute) {
    return hostInstitute._id.toString();
  }

  const fallback = await Institute.findOne({ setupCompleted: true }).sort({ createdAt: 1 });
  if (!fallback) {
    throw new AppError('No institute is available for the student portal yet', 404);
  }

  return fallback._id.toString();
}

/**
 * @param {string} instituteId
 */
export async function getStudentPortalContextForInstitute(instituteId) {
  const portalInstituteId = await resolveStudentPortalInstituteId();
  const [portalInstitute, currentInstitute] = await Promise.all([
    Institute.findById(portalInstituteId).select('name isStudentPortalHost'),
    Institute.findById(instituteId).select('name'),
  ]);

  return {
    portalInstituteId,
    portalInstituteName: portalInstitute?.name ?? 'Student portal institute',
    currentInstituteId: instituteId,
    currentInstituteName: currentInstitute?.name ?? 'Your institute',
    matchesCurrentInstitute: portalInstituteId === instituteId,
    isExplicitHost: Boolean(portalInstitute?.isStudentPortalHost),
  };
}

/**
 * @param {string} instituteId
 */
export async function setStudentPortalHost(instituteId) {
  const institute = await Institute.findById(instituteId);
  if (!institute) {
    throw new AppError('Institute not found', 404);
  }

  await Institute.updateMany({ isStudentPortalHost: true }, { isStudentPortalHost: false });
  institute.isStudentPortalHost = true;
  await institute.save();

  return {
    id: institute._id.toString(),
    name: institute.name,
    isStudentPortalHost: true,
  };
}
