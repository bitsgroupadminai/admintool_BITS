import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../logger/index.js';

/**
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function globalErrorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    const isAvatar = req.originalUrl?.includes('/profile/avatar');
    return sendError(
      res,
      400,
      isAvatar ? 'Profile photo must be 500 KB or smaller' : 'File exceeds maximum allowed size',
    );
  }

  if (err.message?.includes('files are supported')) {
    return sendError(res, 400, err.message);
  }

  if (err.message?.includes('PDF')) {
    return sendError(res, 400, err.message);
  }

  if (err.name === 'ZodError') {
    const errors = err.issues?.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 400, 'Validation failed', errors ?? []);
  }

  if (err.message === 'Not allowed by CORS') {
    return sendError(res, 403, 'This portal is not allowed to access the server from your current address.');
  }

  logger.error({ err }, 'Unhandled error');
  return sendError(res, 500, 'Internal server error');
}
