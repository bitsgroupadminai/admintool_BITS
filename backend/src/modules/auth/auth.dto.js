/**
 * @param {import('../users/user.model.js').User} user
 * @param {import('../institutes/institute.model.js').Institute} [institute]
 */
export function toAuthUserDto(user, institute) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    staffRole: user.staffRole ?? null,
    instituteId: user.instituteId.toString(),
    institute: institute
      ? {
          id: institute._id.toString(),
          name: institute.name,
          setupCompleted: institute.setupCompleted,
        }
      : undefined,
  };
}
