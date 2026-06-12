import bcrypt from 'bcrypt';
import { User } from '../users/user.model.js';
import { Institute } from '../institutes/institute.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';
import { ROLES } from '../../shared/constants/roles.js';
import { createSession, destroySession } from '../../core/services/session.service.js';
import { toAuthUserDto } from './auth.dto.js';

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
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

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
    user: toAuthUserDto(admin, institute),
  };
}

/**
 * @param {import('./auth.validator.js').loginSchema['_output']} payload
 */
export async function loginUser(payload) {
  const email = payload.email.toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !user.isActive) {
    throw new AppError(INVALID_CREDENTIALS_MSG, 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      'Too many failed attempts. Please try again later.',
      429,
    );
  }

  const valid = await verifyPassword(payload.password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.LOGIN_MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new AppError(INVALID_CREDENTIALS_MSG, 401);
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
  });

  return {
    session,
    user: toAuthUserDto(user, institute),
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
