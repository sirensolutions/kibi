import GremlinServerHandler from '../../server/gremlin_server/gremlin_server';
/**
 * The gremlin_server plugin checks the status of the gremlin server.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch', 'kibana'],
    id: 'gremlin_server',

    init: function (server, options) {
      this.status.yellow('Waiting the gremlin server to start up.');

      const loadGremlinServer = () => {
        const _config = server.config();
        const gremlinServerconfig = _config.get('kibi_core.gremlin_server');

        if (gremlinServerconfig) {
          const gremlin = new GremlinServerHandler(server);

          const clean = function (code) {
            return gremlin.stop();
          };

          this.kbnServer.cleaningArray.push(clean);

          gremlin.start().then(() => {
            this.status.green('Gremlin server up and running.');
          })
          .catch((error) => {
            this.status.red(error.message);
          });
        } else {
          this.status.red('Missing gremlin server configuration. Please set it in your config/kibi.yml');
        }
      };

      const status = server.plugins.elasticsearch.status;
      if (status && status.state === 'green') {
        loadGremlinServer();
      } else {
        status.on('change', () => {
          if (server.plugins.elasticsearch.status.state === 'green') {
            loadGremlinServer();
          }
        });
      }
    }
  });
};
