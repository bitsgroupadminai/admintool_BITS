import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../logger/index.js';
import { env } from '../config/env.js';

/**
 * Flatten thrown values so Railway logs show the real failure without expanding `err`.
 * @param {unknown} err
 */
function serializeUnknownError(err) {
  if (err instanceof Error) {
    const cause =
      err.cause instanceof Error
        ? { name: err.cause.name, message: err.cause.message, stack: err.cause.stack }
        : err.cause ?? undefined;
    return {
      name: err.name,
      message: err.message || String(err),
      code: err.code,
      stack: err.stack,
      cause,
      keyValue: err.keyValue,
    };
  }

  if (typeof err === 'object' && err !== null) {
    return {
      name: err.name ?? err.constructor?.name ?? 'Error',
      message: err.message ?? JSON.stringify(err),
      code: err.code,
      stack: err.stack,
    };
  }

  return {
    name: typeof err,
    message: String(err),
  };
}

function requestContext(req) {
  return {
    method: req.method,
    url: req.originalUrl,
    instituteId: req.params?.instituteId ?? req.user?.instituteId ?? undefined,
  };
}

function logRequestError(req, err, label) {
  const details = serializeUnknownError(err);
  logger.error(
    {
      ...requestContext(req),
      errName: details.name,
      errMessage: details.message,
      errCode: details.code,
      errStack: details.stack,
      errCause: details.cause,
      err,
    },
    label,
  );
  return details;
}

function exposedDetails(details) {
  if (!env.EXPOSE_ERROR_DETAILS) return [];
  return [
    {
      name: details.name,
      message: details.message,
      ...(details.code !== undefined ? { code: details.code } : {}),
      ...(details.stack ? { stack: details.stack } : {}),
      ...(details.cause ? { cause: details.cause } : {}),
    },
  ];
}

function sendMappedError(res, req, err, status, message) {
  const details = logRequestError(req, err, message);
  const publicMessage =
    env.EXPOSE_ERROR_DETAILS && details.message && details.message !== message
      ? `${message} (${details.message})`
      : message;
  return sendError(res, status, publicMessage, exposedDetails(details));
}

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function globalErrorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logRequestError(req, err, err.message);
    }
    return sendError(
      res,
      err.statusCode,
      err.message,
      err.errors?.length ? err.errors : err.statusCode >= 500 ? exposedDetails(serializeUnknownError(err)) : [],
    );
  }

  if (err.name === 'CastError') {
    return sendMappedError(res, req, err, 400, 'Invalid identifier in request');
  }

  if (err.name === 'ValidationError') {
    return sendMappedError(res, req, err, 400, 'The request contains invalid data');
  }

  if (err.error?.description || err.statusCode) {
    const description = err.error?.description || err.message || 'Payment provider error';
    const status = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 502;
    return sendMappedError(res, req, err, status === 401 || status === 403 ? 503 : status, description);
  }

  if (err.code === 11000) {
    return sendMappedError(res, req, err, 409, 'This record already exists.');
  }

  if (
    err.name === 'MulterError' ||
    err.code === 'LIMIT_UNEXPECTED_FILE' ||
    /multipart|boundary|Unexpected end of form/i.test(err.message ?? '')
  ) {
    return sendMappedError(res, req, err, 400, 'Could not read the uploaded file. Please try again.');
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    const isAvatar = req.originalUrl?.includes('/profile/avatar');
    return sendMappedError(
      res,
      req,
      err,
      400,
      isAvatar ? 'Profile photo must be 500 KB or smaller' : 'File exceeds maximum allowed size',
    );
  }

  if (err.message?.includes('files are supported')) {
    return sendMappedError(res, req, err, 400, err.message);
  }

  if (err.message?.includes('PDF')) {
    return sendMappedError(res, req, err, 400, err.message);
  }

  if (err.name === 'ZodError') {
    const errors = err.issues?.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    logRequestError(req, err, 'Validation failed');
    return sendError(res, 400, 'Validation failed', errors ?? []);
  }

  if (err.message === 'Not allowed by CORS') {
    return sendMappedError(
      res,
      req,
      err,
      403,
      'This portal is not allowed to access the server from your current address.',
    );
  }

  const details = logRequestError(req, err, 'Unhandled error');
  return sendError(
    res,
    500,
    env.EXPOSE_ERROR_DETAILS ? details.message || 'Internal server error' : 'Internal server error',
    exposedDetails(details),
  );
}
