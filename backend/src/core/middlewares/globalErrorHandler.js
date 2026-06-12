import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../logger/index.js';

/**
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function globalErrorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 400, 'File exceeds maximum allowed size');
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

  logger.error({ err }, 'Unhandled error');
  return sendError(res, 500, 'Internal server error');
}
