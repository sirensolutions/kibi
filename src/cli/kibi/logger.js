/**
 * A command line logger.
 */
export default class CliLogger {

  /**
   * Creates a new CliLogger.
   *
   * @param {Object} settings The logging settings
   */
  constructor(settings) {
    this._settings = settings;
  }

  /**
   * Logs a generic message.
   *
   * The message will not be displayed if either `settings.quiet` or `settings.silent` is true.
   */
  log(message) {
    if (this._settings.quiet || this._settings.silent) {
      return;
    }
    process.stdout.write(`${message}\n`);
  }

  /**
   * Logs an error message.
   *
   * The message will not be displayed if `settings.silent` is true.
   */
  error(message) {
    if (this._settings.silent) return;
    process.stdout.write(`${message}\n`);
  }

}
