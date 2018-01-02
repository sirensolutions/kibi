import MigrationRunner from 'kibiutils/lib/migrations/migration_runner';
import MigrationLogger from 'kibiutils/lib/migrations/migration_logger';

/**
 * The migrations plugin checks if there are objects that can be upgraded.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],
    id: 'migrations',

    init: function (server, options) {
      this.status.yellow('Checking for out of date objects.');

      const checkMigrations = () => {
        const logger = new MigrationLogger(server, 'migrations');
        const runner = new MigrationRunner(server, logger);

        runner.count().then((count) => {
          if (count > 0) {
            let outOfDateObjectsMessage = `There are ${count} objects that are out of date. `;
            outOfDateObjectsMessage += 'please run "bin/investigate upgrade" and restart the server.';
            this.status.red(outOfDateObjectsMessage);
          } else {
            this.status.green('All objects are up to date.');
          }
        }).catch ((err) => {
          server.log(['error', 'migration'], err);
          this.status.red(`An error occurred while checking for out of date objects: ${err}`);
        });
      };

      const status = server.plugins.elasticsearch.status;
      if (status && status.state === 'green') {
        checkMigrations();
      } else {
        status.on('change', () => {
          if (server.plugins.elasticsearch.status.state === 'green') {
            checkMigrations();
          }
        });
      }
    }

  });

};
