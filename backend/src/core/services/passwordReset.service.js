import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { redisClient } from '../config/redis.js';
import { User } from '../../modules/users/user.model.js';
import { Institute } from '../../modules/institutes/institute.model.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../../shared/constants/roles.js';
import { buildPasswordResetEmail } from '../../shared/templates/emailLayout.js';
import { queueEmailNotification } from './email.service.js';
import { getAdminPortalUrl, getStudentPortalUrl } from '../../shared/helpers/portalUrls.helper.js';

const RESET_PREFIX = 'password-reset:';
const RESET_TTL_SECONDS = 10 * 60;
const SALT_ROUNDS = 12;

/**
 * @param {string} password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * @param {string} email
 */
export async function requestPasswordReset(email) {
  const normalized = email.toLowerCase().trim();
  const users = await User.find({ email: normalized, isActive: true });

  for (const user of users) {
    const token = crypto.randomBytes(32).toString('hex');
    await redisClient.setEx(
      `${RESET_PREFIX}${token}`,
      RESET_TTL_SECONDS,
      JSON.stringify({ userId: user._id.toString(), email: normalized }),
    );

    const institute = await Institute.findById(user.instituteId).select('name');
    const baseUrl =
      user.role === ROLES.STUDENT ? getStudentPortalUrl() : getAdminPortalUrl();
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
    const portalLabel = user.role === ROLES.STUDENT ? 'EduPortal Student' : 'EduPortal Staff';
    const instituteLabel = institute?.name ? ` (${institute.name})` : '';
    const mail = buildPasswordResetEmail({
      recipientName: user.name,
      resetUrl,
      portalLabel: `${portalLabel}${instituteLabel}`,
    });

    await queueEmailNotification({
      to: normalized,
      type: 'password_reset',
      ...mail,
    });
  }

  return {
    message: 'If an account exists for this email, a reset link has been sent.',
  };
}

/**
 * @param {string} token
 * @param {string} password
 */
export async function resetPasswordWithToken(token, password) {
  const payload = await redisClient.get(`${RESET_PREFIX}${token}`);
  if (!payload) {
    throw new AppError('This reset link is invalid or has expired', 400);
  }

  const { userId } = JSON.parse(payload);
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.isActive) {
    throw new AppError('This reset link is invalid or has expired', 400);
  }

  user.passwordHash = await hashPassword(password);
  user.mustChangePassword = false;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();
  await redisClient.del(`${RESET_PREFIX}${token}`);

  return user;
}
