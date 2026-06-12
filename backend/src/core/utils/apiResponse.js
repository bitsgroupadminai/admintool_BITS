/**
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {unknown} [data]
 */
export function sendSuccess(res, statusCode, message, data) {
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? {},
  });
}

/**
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {unknown[]} [errors]
 */
export function sendError(res, statusCode, message, errors = []) {
  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}
