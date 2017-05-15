/**
 * Thrown when access to an object is not authorized.
 */
export default class AuthorizationError extends Error {
  /**
   * Creates a new AuthorizationError.
   *
   * @param {string} message - The error message.
   * @param {Error} inner - An optional error that caused the AuthenticationError.
   */
  constructor(message, inner) {
    super(message);
    this.name = 'AuthorizationError';
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
