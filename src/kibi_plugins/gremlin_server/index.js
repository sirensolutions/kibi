import GremlinServerHandler from '../../server/gremlin_server/gremlin_server';

/**
 * The gremlin_server plugin checks the status of the gremlin server.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch', 'kibana', 'migrations'],
    id: 'gremlin_server',

    init: function (server, options) {
      let gremlin;
      this.status.yellow('Waiting the Siren Gremlin Server to start up.');

      const _config = server.config();
      const gremlinServerconfig = _config.get('investigate_core.gremlin_server');

      if (gremlinServerconfig) {
        gremlin = new GremlinServerHandler(server);

        const loadGremlinServer = () => {
          const clean = function (code) {
            if (gremlin) {
              return gremlin.stop();
            } else {
              return Promise.resolve();
            }
          };
          gremlin.start().then(() => {
            this.status.green('Siren Gremlin Server up and running.');
            this.kbnServer.cleaningArray.push(clean);
          })
          .catch((error) => {
            this.status.red(error.message);
          });
        };

        const status = server.plugins.elasticsearch.status;
        if (status && status.state === 'green') {
          loadGremlinServer();
        } else {
          status.on('change', () => {
            if (status.state === 'green' && !gremlin.isInitialized()) {
              loadGremlinServer();
            } else if (status.state === 'red' && gremlin.isInitialized()) {
              this.status.red('Unable to connect to ElasticSsearch.');
              gremlin.stop();
            }
          });
        }
      } else {
        this.status.red('Siren Gremlin Server configuration not found in investigate.yml, please configure it.');
      }
    }
  });
};
