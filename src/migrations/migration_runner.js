import { each, has } from 'lodash';

/**
 * A migration runner.
 */
export default class MigrationRunner {
  /**
   * Creates a new Migration runner.
   *
   * @param {MigrationLogger} logger A logger instance.
   * @param {KbnServer.server} server A server instance.
   */
  constructor(server, logger) {
    this._server = server;
    this._logger = logger;
  }

  /**
   * Gets migration classes from plugins that expose the `getMigrations`
   * method and instantiates them.
   *
   * The runner passes a configuration object to the migration constructor which
   * contains the following attributes:
   *
   * - index: the name of the Kibi index.
   * - client: an instance of an Elasticsearch client configured to connect to the Kibi cluster.
   *
   * Each migration must expose the following:
   *
   * - `count`: returns the number of objects that can be upgraded.
   * - `upgrade`: runs the migration and returns the number of upgraded
   *              objects.
   *
   * Migrations are cached and executed in the order returned by each plugin;
   * the plugins are scanned in the order returned by the PluginCollection in
   * server.plugins.
   *
   * Currently it is not possible to defined dependencies between migrations
   * declared in different plugins, so be careful about modifying objects
   * shared by more than one plugin.
   */
  getMigrations() {
    if (this._migrations) {
      return this._migrations;
    }
    let migrations = [];
    each(this._server.plugins, (plugin) => {
      if (has(plugin, 'getMigrations')) {
        for (let Migration of plugin.getMigrations()) {
          let configuration = {
            config: this._server.config(),
            client: this._server.plugins.elasticsearch.client,
            logger: this._logger
          };
          let migration = new Migration(configuration);
          migrations.push(migration);
        }
      }
    });
    this._migrations = migrations;
    return this._migrations;
  }

  /**
   * Counts objects that can be upgraded by executing the `count` method of each migration returned by the installed plugins.
   *
   * @returns The number of objects that can be upgraded.
   */
  async count() {
    let count = 0;
    for (let migration of this.getMigrations()) {
      count += await migration.count();
    }
    return count;
  }

  /**
   * Performs an upgrade by executing the `upgrade` method of each migration returned by the installed plugins.
   *
   * @returns The number of objects upgraded.
   */
  async upgrade() {
    let upgraded = 0;
    for (let migration of this.getMigrations()) {
      this._logger.info(`Processing migration "${migration.constructor.description}"`);
      let count = await migration.upgrade();
      upgraded += count;
      if (count > 0) {
        this._logger.info(`Upgraded ${count} objects.`);
      } else {
        this._logger.info('No objects upgraded.');
      }
      this._logger.info(`Processed migration "${migration.constructor.description}"`);
    }
    return upgraded;
  }
};
