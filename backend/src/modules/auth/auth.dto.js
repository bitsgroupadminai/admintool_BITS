import { Institute } from '../institutes/institute.model.js';
import { Offering } from '../offerings/offering.model.js';

/**
 * @param {import('../users/user.model.js').User} user
 * @param {import('../institutes/institute.model.js').Institute} [institute]
 */
export async function toAuthUserDto(user, institute) {
  let enrolledProgramme = null;
  if (user.enrolledOfferingId) {
    const offering = await Offering.findById(user.enrolledOfferingId).select('name');
    if (offering) {
      enrolledProgramme = {
        id: offering._id.toString(),
        name: offering.name,
      };
    }
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    staffRole: user.staffRole ?? null,
    instituteId: user.instituteId.toString(),
    mustChangePassword: Boolean(user.mustChangePassword),
    enrolledOfferingId: user.enrolledOfferingId?.toString() ?? null,
    enrollmentStatus: user.enrollmentStatus ?? null,
    enrolledProgramme,
    institute: institute
      ? {
          id: institute._id.toString(),
          name: institute.name,
          setupCompleted: institute.setupCompleted,
        }
      : undefined,
  };
}
