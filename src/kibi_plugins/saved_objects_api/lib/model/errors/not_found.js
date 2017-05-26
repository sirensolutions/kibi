/**
 * Thrown when an object is not found.
 */
export default class NotFoundError extends Error {
  /**
   * Creates a new NotFoundError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the NotFoundError.
   */
  constructor(message, inner) {
    super(message);
    this.name = 'NotFoundError';
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
