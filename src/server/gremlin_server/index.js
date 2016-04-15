var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Promise.method(function (kbnServer, server, config) {
  if (config.get('plugins.initialize') && config.get('pkg.kibiEnterpriseEnabled')) {
    var config = server.config();
    var gremlinServerPath = config.get('kibi_core.gremlin_server');

    if (gremlinServerPath) {
      var GremlinServerHandler = require('./gremlin_server');
      var gremlin = new GremlinServerHandler(server);

      return gremlin.start().then(function (message) {
        if (!message.error) {
          var clean = function (code) {
            return gremlin.stop();
          };

          kbnServer.cleaningArray.push(clean);
        }
      });
    } else {
      return true;
    }
  } else {
    return true;
  }
});
