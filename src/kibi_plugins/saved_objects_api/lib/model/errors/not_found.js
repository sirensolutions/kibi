/**
 * Thrown when an object is not found.
 */
export default class NotFoundError {
  /**
   * Creates a new NotFoundError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the NotFoundError.
   */
  constructor(message, inner) {
    this.name = 'NotFoundError';
    this.message = message;
    this.inner = inner;
    this.stack = new Error().stack;
  }
}
