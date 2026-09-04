import bcrypt from 'bcrypt';
import { User } from '../users/user.model.js';
import { Institute } from '../institutes/institute.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';
import { ROLES } from '../../shared/constants/roles.js';
import { createSession, destroySession, getSession, touchSession } from '../../core/services/session.service.js';
import { toAuthUserDto } from './auth.dto.js';
import { deleteAvatarFile } from '../../shared/helpers/avatar.helper.js';
import { Application } from '../applications/application.model.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { purgeInstitute } from '../institutes/institute.purge.helper.js';

const INVALID_CREDENTIALS_MSG = 'Invalid email or password';
const SALT_ROUNDS = 12;

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * @param {import('./auth.validator.js').signupSchema['_output']} payload
 */
export async function signupAdmin(payload) {
  const email = payload.email.toLowerCase();

  const institute = await Institute.create({ name: payload.instituteName });
  const passwordHash = await hashPassword(payload.password);

  const admin = await User.create({
    name: payload.adminName,
    email,
    passwordHash,
    role: ROLES.ADMIN,
    instituteId: institute._id,
  });

  const session = await createSession({
    userId: admin._id.toString(),
    role: admin.role,
    instituteId: institute._id.toString(),
    email: admin.email,
    name: admin.name,
  });

  return {
    session,
    user: await toAuthUserDto(admin, institute),
  };
}

/**
 * @param {'student' | 'admin' | 'staff' | undefined} portal
 * @returns {string[] | null}
 */
function preferredRolesForPortal(portal) {
  if (portal === 'student') return [ROLES.STUDENT];
  if (portal === 'admin' || portal === 'staff') return [ROLES.ADMIN, ROLES.STAFF];
  return null;
}

/**
 * @param {import('./auth.validator.js').loginSchema['_output']} payload
 */
export async function loginUser(payload) {
  const email = payload.email.toLowerCase();
  let candidates = await User.find({ email, isActive: true }).select('+passwordHash');

  const preferredRoles = preferredRolesForPortal(payload.portal);
  if (preferredRoles) {
    candidates = candidates.filter((candidate) => preferredRoles.includes(candidate.role));
  }

  if (!candidates.length) {
    throw new AppError(INVALID_CREDENTIALS_MSG, 401);
  }

  /** @type {typeof candidates[0] | null} */
  let user = null;
  for (const candidate of candidates) {
    if (candidate.lockedUntil && candidate.lockedUntil > new Date()) {
      continue;
    }
    const valid = await verifyPassword(payload.password, candidate.passwordHash);
    if (valid) {
      user = candidate;
      break;
    }
  }

  if (!user) {
    // Increment failed attempts on all unlocked candidates with this email
    const lockedMsg = candidates.some((c) => c.lockedUntil && c.lockedUntil > new Date());
    for (const candidate of candidates) {
      if (candidate.lockedUntil && candidate.lockedUntil > new Date()) continue;
      candidate.failedLoginAttempts += 1;
      if (candidate.failedLoginAttempts >= env.LOGIN_MAX_ATTEMPTS) {
        candidate.lockedUntil = new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000);
        candidate.failedLoginAttempts = 0;
      }
      await candidate.save();
    }
    if (lockedMsg && candidates.every((c) => c.lockedUntil && c.lockedUntil > new Date())) {
      throw new AppError('Too many failed attempts. Please try again later.', 429);
    }
    throw new AppError(INVALID_CREDENTIALS_MSG, 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      'Too many failed attempts. Please try again later.',
      429,
    );
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();

  const institute = await Institute.findById(user.instituteId);
  const session = await createSession({
    userId: user._id.toString(),
    role: user.role,
    instituteId: user.instituteId.toString(),
    email: user.email,
    name: user.name,
    staffRole: user.staffRole,
    mustChangePassword: Boolean(user.mustChangePassword),
    enrolledOfferingId: user.enrolledOfferingId?.toString() ?? null,
    enrollmentStatus: user.enrollmentStatus ?? null,
  });

  return {
    session,
    user: await toAuthUserDto(user, institute),
  };
}

/**
 * @param {string} sessionId
 */
export async function logoutUser(sessionId) {
  if (sessionId) {
    await destroySession(sessionId);
  }
}

function normalizeInstituteName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Permanently delete the signed-in admin, their institute, staff, students,
 * and all tenant data so the email can be used to sign up again.
 * @param {string} userId
 * @param {{ password: string, instituteName: string }} payload
 * @param {string} [sessionId]
 */
export async function deleteAdminAccount(userId, payload, sessionId) {
  const admin = await User.findById(userId).select('+passwordHash');
  if (!admin || !admin.isActive) {
    throw new AppError('User not found', 404);
  }
  if (admin.role !== ROLES.ADMIN) {
    throw new AppError('Only an institute admin can delete this account', 403);
  }

  const passwordOk = await verifyPassword(payload.password, admin.passwordHash);
  if (!passwordOk) {
    throw new AppError('Password is incorrect', 400);
  }

  const institute = await Institute.findById(admin.instituteId);
  if (!institute) {
    throw new AppError('Institute not found', 404);
  }
  if (normalizeInstituteName(payload.instituteName) !== normalizeInstituteName(institute.name)) {
    throw new AppError('Institute name does not match', 400);
  }

  await purgeInstitute(institute._id);
  await destroySession(sessionId);
}

/**
 * @param {string} userId
 */
export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }
  const institute = await Institute.findById(user.instituteId);
  return toAuthUserDto(user, institute);
}

/**
 * @param {string} userId
 * @param {import('./auth.validator.js').updateProfileSchema['_output']} payload
 * @param {string} [sessionId]
 */
export async function updateCurrentUserProfile(userId, payload, sessionId) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  if (payload.name?.trim()) {
    const nextName = payload.name.trim();
    const nameChanged = user.name !== nextName;
    user.name = nextName;

    if (nameChanged && user.role === ROLES.STUDENT) {
      await Application.updateMany(
        { instituteId: user.instituteId, applicantEmail: String(user.email).toLowerCase() },
        { $set: { applicantName: nextName } },
      );
      await flushInstituteReadCache(user.instituteId.toString());
    }
  }

  if (payload.newPassword) {
    if (!payload.currentPassword) {
      throw new AppError('Current password is required to set a new password', 400);
    }

    const valid = await verifyPassword(payload.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 401);
    }

    user.passwordHash = await hashPassword(payload.newPassword);
    user.mustChangePassword = false;
  }

  await user.save();

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session?.userId === userId) {
      await touchSession(sessionId, {
        ...session,
        name: user.name,
        mustChangePassword: Boolean(user.mustChangePassword),
      });
    }
  }

  const institute = await Institute.findById(user.instituteId);
  return toAuthUserDto(user, institute);
}

/**
 * @param {string} userId
 * @param {Express.Multer.File} file
 */
export async function uploadUserAvatar(userId, file) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  if (user.avatarUrl) {
    await deleteAvatarFile(user.avatarUrl);
  }

  user.avatarUrl = `/uploads/avatars/${file.filename}`;
  await user.save();

  const institute = await Institute.findById(user.instituteId);
  return toAuthUserDto(user, institute);
}

/**
 * @param {string} userId
 */
export async function removeUserAvatar(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  if (user.avatarUrl) {
    await deleteAvatarFile(user.avatarUrl);
    user.avatarUrl = undefined;
    await user.save();
  }

  const institute = await Institute.findById(user.instituteId);
  return toAuthUserDto(user, institute);
}

/**
 * @param {string} userId
 * @param {string} [sessionId]
 */
async function refreshStudentSession(userId, sessionId) {
  if (!sessionId) return;
  const session = await getSession(sessionId);
  if (!session || session.userId !== userId) return;
  const user = await User.findById(userId);
  if (!user) return;
  await touchSession(sessionId, {
    ...session,
    mustChangePassword: Boolean(user.mustChangePassword),
    enrolledOfferingId: user.enrolledOfferingId?.toString() ?? null,
    enrollmentStatus: user.enrollmentStatus ?? null,
  });
}

/**
 * @param {string} userId
 * @param {{ password: string }} payload
 * @param {string} [sessionId]
 */
export async function changeStudentPassword(userId, payload, sessionId) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.isActive || user.role !== ROLES.STUDENT) {
    throw new AppError('User not found', 404);
  }

  user.passwordHash = await hashPassword(payload.password);
  user.mustChangePassword = false;
  await user.save();
  await refreshStudentSession(userId, sessionId);

  const institute = await Institute.findById(user.instituteId);
  return toAuthUserDto(user, institute);
}

/**
 * @param {string} userId
 * @param {string} [sessionId]
 */
export async function skipPasswordChange(userId, sessionId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive || user.role !== ROLES.STUDENT) {
    throw new AppError('User not found', 404);
  }

  user.mustChangePassword = false;
  await user.save();
  await refreshStudentSession(userId, sessionId);

  const institute = await Institute.findById(user.instituteId);
  return toAuthUserDto(user, institute);
}
