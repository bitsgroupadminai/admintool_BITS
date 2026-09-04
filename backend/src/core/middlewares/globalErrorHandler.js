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

  if (err.name === 'CastError') {
    return sendError(res, 400, 'Invalid identifier in request');
  }

  if (err.name === 'ValidationError') {
    return sendError(res, 400, 'The request contains invalid data');
  }

  if (err.error?.description || err.statusCode) {
    const description = err.error?.description || err.message || 'Payment provider error';
    const status = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 502;
    logger.error({ err }, 'Payment provider error');
    return sendError(res, status === 401 || status === 403 ? 503 : status, description);
  }

  if (err.code === 11000) {
    return sendError(res, 409, 'This record already exists.');
  }

  if (
    err.name === 'MulterError' ||
    err.code === 'LIMIT_UNEXPECTED_FILE' ||
    /multipart|boundary|Unexpected end of form/i.test(err.message ?? '')
  ) {
    return sendError(res, 400, 'Could not read the uploaded file. Please try again.');
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
