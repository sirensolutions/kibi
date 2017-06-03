import BaseError from './base';

/**
 * Thrown when saving an object would generate a conflict.
 */
export default class ConflictError extends BaseError {
  /**
   * Creates a new ConflictError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the ConflictError.
   */
  constructor(message, inner) {
    super(message, inner);
    this.name = 'ConflictError';
  }
}
