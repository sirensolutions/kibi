var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Promise.method(function (kbnServer, server, config) {
  var GremlinServerHandler = require('./gremlin_server');
  if (server.config().get('kibi_core.enterprise_enabled') === true) {
    var gremlin = new GremlinServerHandler(server);

    return gremlin.start().then(function (message) {

      var clean = function (code) {
        return gremlin.stop();
      };

      kbnServer.cleaningArray.push(clean);
    });
  } else {
    return true;
  }
});
