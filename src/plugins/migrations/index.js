import requirefrom from 'requirefrom';
const MigrationRunner = requirefrom('src/migrations')('migration_runner');
const MigrationLogger = requirefrom('src/migrations')('migration_logger');

/**
 * The migrations plugin checks if there are objects that can be upgraded.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],
    id: 'migrations',

    init: function (server, options) {
      this.status.yellow('Checking for out of date objects.');

      var checkMigrations = () => {
        let logger = new MigrationLogger(server, 'migrations');
        let runner = new MigrationRunner(server, logger);

        runner.count().then((count) => {
          if (count > 0) {
            this.status.red(`There are ${count} objects that are out of date; please run "bin/kibi upgrade" and restart the server.`);
          } else {
            this.status.green('All objects are up to date.');
          }
        }).catch ((err) => {
          this.status.red(`An error occurred while checking for out of date objects: ${err}`);
        });
      };

      let status = server.plugins.elasticsearch.status;
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
