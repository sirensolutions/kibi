import GremlinServerHandler from '../../server/gremlin_server/gremlin_server';
/**
 * The gremlin_server plugin checks the status of the gremlin server.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch', 'kibana'],
    id: 'gremlin_server',

    init: function (server, options) {
      let gremlin;
      this.status.yellow('Waiting the gremlin server to start up.');

      const _config = server.config();
      const gremlinServerconfig = _config.get('kibi_core.gremlin_server');

      if (gremlinServerconfig) {
        gremlin = new GremlinServerHandler(server);
      } else {
        this.status.red('Gremlin server configuration not found in kibi.yml, please configure it.');
      }

      const loadGremlinServer = () => {
        const clean = function (code) {
          if (gremlin) {
            return gremlin.stop();
          } else {
            return Promise.resolve();
          }
        };
        gremlin.start().then(() => {
          this.status.green('Gremlin server up and running.');
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
    }
  });
};
