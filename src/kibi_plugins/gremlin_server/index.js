import GremlinServerHandler from '../../server/gremlin_server/gremlin_server';
/**
 * The gremlin_server plugin checks the status of the gremlin server.
 */
module.exports = function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch', 'kibana'],
    id: 'gremlin_server',

    init: function (server, options) {
      let gremlinServer;
      this.status.yellow('Waiting the gremlin server to start up.');

      const loadGremlinServer = () => {
        const _config = server.config();
        const gremlinServerconfig = _config.get('kibi_core.gremlin_server');

        if (gremlinServerconfig) {
          const gremlin = new GremlinServerHandler(server);

          const clean = function (code) {
            if (gremlinServer) {
              return gremlin.stop();
            } else {
              return Promise.resolve();
            }
          };

          gremlin.start().then(() => {
            this.status.green('Gremlin server up and running.');
            this.kbnServer.cleaningArray.push(clean);
            gremlinServer = gremlin;
          })
          .catch((error) => {
            this.status.red(error.message);
          });
        } else {
          this.status.red('Gremlin server configuration not found in kibi.yml, please configure it.');
        }
      };

      const status = server.plugins.elasticsearch.status;
      if (status && status.state === 'green') {
        loadGremlinServer();
      } else {
        status.on('change', () => {
          console.log('test status');
          console.log(status.state);
          if (status.state === 'green' && !gremlinServer) {
            loadGremlinServer();
          } else if (status.state === 'red' && gremlinServer) {
            gremlinServer.stop();
            gremlinServer = null;
          }
        });
      }
    }
  });
};
