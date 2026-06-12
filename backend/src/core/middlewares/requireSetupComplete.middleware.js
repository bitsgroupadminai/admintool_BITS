import { AppError } from '../utils/AppError.js';
import { Institute } from '../../modules/institutes/institute.model.js';
import { ROLES } from '../../shared/constants/roles.js';

/**
 * Blocks dashboard access until institute setup is complete (admin only).
 */
export async function requireSetupComplete(req, _res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return next();
    }

    const institute = await Institute.findById(req.user.instituteId).select('setupCompleted');
    if (!institute?.setupCompleted) {
      throw new AppError('Please complete institute setup first', 403, [
        { code: 'SETUP_INCOMPLETE' },
      ]);
    }
    return next();
  } catch (err) {
    return next(err);
  }
}
