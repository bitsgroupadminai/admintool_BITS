import { User } from '../../modules/users/user.model.js';
import { ROLES } from '../constants/roles.js';

/**
 * Prefer the student's current profile name over a frozen application snapshot.
 */
export async function applyCurrentStudentName(application, user) {
  const liveName = await loadCurrentStudentName(
    application.instituteId,
    user?.email || application.applicantEmail,
  );
  const name = liveName || user?.name?.trim();
  if (name) {
    application.applicantName = name;
  }
  return application.applicantName;
}

export async function loadCurrentStudentName(instituteId, email) {
  if (!email) return '';
  const student = await User.findOne({
    instituteId,
    email: String(email).toLowerCase(),
    role: ROLES.STUDENT,
  }).select('name');
  return student?.name?.trim() || '';
}
