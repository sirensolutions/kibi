import BaseError from './base';

/**
 * Thrown when an object is not found.
 */
export default class NotFoundError extends BaseError {
  /**
   * Creates a new NotFoundError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the NotFoundError.
   */
  constructor(message, inner) {
    super(message, inner);
    this.name = 'NotFoundError';
  }
}
