/**
 * Thrown when authentication is required.
 */
export default class AuthenticationError extends Error {
  /**
   * Creates a new AuthenticationError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the AuthenticationError.
   */
  constructor(message, inner) {
    super(message);
    this.name = 'AuthenticationError';
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
