export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {unknown[]} [errors]
   */
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}
