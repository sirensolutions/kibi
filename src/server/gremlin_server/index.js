var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Promise.method(function (kbnServer, server, config) {
  var GremlinServerHandler = require('./gremlin_server');
  if (server.config().get('kibi_core.enterprise_enabled')) {
    var gremlin = new GremlinServerHandler(server);

    gremlin.start().then(function (message) {

      var clean = _.once(function (code) {
        return gremlin.stop();
      });

      process.once('exit', function () {
        // for "natural" exits
        clean().finally(function () {

          // resend exit
          process.kill(process.pid, 'exit');
        });
      });

      process.once('SIGINT', function () {
        // for Ctrl-C exits
        clean().finally(function () {

          // resend SIGINT
          process.kill(process.pid, 'SIGINT');
        });
      });
    });
  }
});
