import BaseError from './base';

/**
 * Thrown when authentication is required.
 */
export default class AuthenticationError extends BaseError {
  /**
   * Creates a new AuthenticationError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the AuthenticationError.
   */
  constructor(message, inner) {
    super(message, inner);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}
