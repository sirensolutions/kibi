/**
 * Thrown when authentication is required.
 */
export default class AuthenticationError {
  /**
   * Creates a new AuthenticationError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the AuthenticationError.
   */
  constructor(message, inner) {
    this.name = 'AuthenticationError';
    this.message = message;
    this.inner = inner;
    this.stack = new Error().stack;
  }
}
