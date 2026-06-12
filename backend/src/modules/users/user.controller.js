import { createStaffSchema, updateStaffSchema } from '../auth/auth.validator.js';
import * as userService from './user.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function listStaff(req, res, next) {
  try {
    const staff = await userService.listStaffUsers(req.user.instituteId);
    sendSuccess(res, 200, 'Staff users', { staff });
  } catch (err) {
    next(err);
  }
}

export async function createStaff(req, res, next) {
  try {
    const payload = createStaffSchema.parse(req.body);
    const staff = await userService.createStaffUser(req.user.instituteId, payload);
    sendSuccess(res, 201, 'Staff user created', { staff });
  } catch (err) {
    next(err);
  }
}

export async function updateStaff(req, res, next) {
  try {
    const payload = updateStaffSchema.parse(req.body);
    const staff = await userService.updateStaffUser(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Staff user updated', { staff });
  } catch (err) {
    next(err);
  }
}

export async function deactivateStaff(req, res, next) {
  try {
    const result = await userService.deactivateStaffUser(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Staff user deactivated', result);
  } catch (err) {
    next(err);
  }
}

export async function getStaffRoles(req, res, next) {
  try {
    const roles = await userService.getAvailableStaffRoles(req.user.instituteId);
    sendSuccess(res, 200, 'Staff roles', { roles });
  } catch (err) {
    next(err);
  }
}
