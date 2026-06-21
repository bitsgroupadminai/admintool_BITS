import { sendError } from '../utils/apiResponse.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function notFoundHandler(req, res) {
  return sendError(res, 404, 'The requested resource was not found.');
}
