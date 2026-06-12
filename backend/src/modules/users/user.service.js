import bcrypt from 'bcrypt';
import { User } from './user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { ROLES, STAFF_ROLES } from '../../shared/constants/roles.js';
import {
  getStaffRolesForInstitute,
  resolveStaffRole,
} from '../../shared/helpers/staffRole.helper.js';

const SALT_ROUNDS = 12;

/**
 * @param {string} instituteId
 */
export async function listStaffUsers(instituteId) {
  const users = await User.find({
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  })
    .select('name email staffRole createdAt')
    .sort({ createdAt: -1 });

  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    staffRole: u.staffRole,
    createdAt: u.createdAt,
  }));
}

/**
 * @param {string} instituteId
 * @param {{ name: string, email: string, staffRole: string, password: string }} payload
 */
export async function createStaffUser(instituteId, payload) {
  const email = payload.email.toLowerCase();
  const staffRole = await resolveStaffRole(instituteId, payload.staffRole);

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const user = await User.create({
    name: payload.name,
    email,
    passwordHash,
    role: ROLES.STAFF,
    staffRole,
    instituteId,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    staffRole: user.staffRole,
    createdAt: user.createdAt,
  };
}

/**
 * @param {string} staffId
 * @param {string} instituteId
 * @param {{ name?: string, email?: string, staffRole?: string, password?: string }} payload
 */
export async function updateStaffUser(staffId, instituteId, payload) {
  const user = await User.findOne({
    _id: staffId,
    instituteId,
    role: ROLES.STAFF,
    isActive: true,
  });

  if (!user) {
    throw new AppError('Staff user not found', 404);
  }

  if (payload.name) {
    user.name = payload.name;
  }

  if (payload.email) {
    const email = payload.email.toLowerCase();
    if (email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) {
        throw new AppError('A user with this email already exists', 409);
      }
      user.email = email;
    }
  }

  if (payload.staffRole) {
    user.staffRole = await resolveStaffRole(instituteId, payload.staffRole);
  }

  if (payload.password) {
    user.passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  }

  await user.save();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    staffRole: user.staffRole,
    createdAt: user.createdAt,
  };
}

/**
 * @param {string} staffId
 * @param {string} instituteId
 */
export async function deactivateStaffUser(staffId, instituteId) {
  const user = await User.findOne({
    _id: staffId,
    instituteId,
    role: ROLES.STAFF,
  });

  if (!user) {
    throw new AppError('Staff user not found', 404);
  }

  user.isActive = false;
  await user.save();
  return { id: user._id.toString() };
}

/**
 * @param {string} instituteId
 */
export async function getAvailableStaffRoles(instituteId) {
  const customRoles = await getStaffRolesForInstitute(instituteId);
  const custom = customRoles.map((label) => ({
    value: label,
    label,
    isCustom: true,
  }));

  return [...STAFF_ROLES, ...custom];
}
