import { AppError } from '../utils/AppError.js';
import { ROLE_PERMISSIONS } from '../../shared/constants/permissions.js';

/**
 * @param {...string} permissions
 * @returns {import('express').RequestHandler}
 */
export function authorize(...permissions) {
  return (req, _res, next) => {
    const userPermissions = ROLE_PERMISSIONS[req.user?.role] ?? [];
    const allowed = permissions.every((p) => userPermissions.includes(p));

    if (!allowed) {
      return next(new AppError('You are not authorized to perform this action', 403));
    }
    return next();
  };
}

/**
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('You are not authorized to perform this action', 403));
    }
    return next();
  };
}
