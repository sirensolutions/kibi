const _ = require('lodash');
const Promise = require('bluebird');

module.exports = Promise.method(function (kbnServer, server, config) {
  if (config.get('plugins.initialize')) {
    const _config = server.config();
    const gremlinServerPath = _config.get('kibi_core.gremlin_server');

    if (gremlinServerPath) {
      const GremlinServerHandler = require('./gremlin_server');
      const gremlin = new GremlinServerHandler(server);

      const clean = function (code) {
        return gremlin.stop();
      };

      kbnServer.cleaningArray.push(clean);

      return gremlin.start();
    } else {
      return true;
    }
  } else {
    return true;
  }
});
