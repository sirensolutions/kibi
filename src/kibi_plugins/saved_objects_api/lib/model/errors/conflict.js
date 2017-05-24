/**
 * Thrown when saving an object would generate a conflict.
 */
export default class ConflictError extends Error {
  /**
   * Creates a new ConflictError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the ConflictError.
   */
  constructor(message, inner) {
    super(message);
    this.name = 'ConflictError';
    this.inner = inner;

    return new Proxy(this, {
      get(target, name) {
        const value = target[name];

        if (value) {
          return value;
        }
        return inner[name];
      }
    });
  }

}
