import BaseError from './base';

/**
 * Thrown when access to an object is not authorized.
 */
export default class AuthorizationError extends BaseError {
  /**
   * Creates a new AuthorizationError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the AuthenticationError.
   */
  constructor(message, inner) {
    super(message, inner);
    this.name = 'AuthorizationError';
  }
}
