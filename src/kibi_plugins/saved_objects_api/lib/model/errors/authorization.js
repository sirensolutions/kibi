/**
 * Thrown when access to an object is not authorized.
 */
export default class AuthorizationError {
  /**
   * Creates a new AuthorizationError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the AuthenticationError.
   */
  constructor(message, inner) {
    this.name = 'AuthorizationError';
    this.message = message;
    this.inner = inner;
    this.stack = new Error().stack;
  }
}
