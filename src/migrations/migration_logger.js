/**
 * A logger for migrations.
 */
export default class MigrationLogger {

  /**
   * Creates a new MigrationLogger.
   *
   * @param {KbnServer.server} server - A server instance.
   * @param {String} name - The logger name.
   */
  constructor(server, name) {
    this._name = name;
    this._server = server;
  }

  error(message) {
    this._server.log(['error', this._name], message);
  }

  warning(message) {
    this._server.log(['warning', this._name], message);
  }

  debug(message) {
    this._server.log(['debug', this._name], message);
  }

  info(message) {
    this._server.log(['info', this._name], message);
  }

};
