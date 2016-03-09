var childProcess = require('child_process');
var fs = require('fs');
var Promise = require('bluebird');
var rp = require('request-promise');
var http = require('http');

function GremlinServerHandler(server) {
  this.gremlinServer = null;
  this.initialized = false;
  this.server = server;
}

GremlinServerHandler.prototype.start = function () {
  var self = this;

  if (self.initialized === true) {
    return Promise.resolve({
      message: 'GremlinServerHandler already initialized'
    });
  }

  return new Promise(function (fulfill, reject) {
    self.server.log(['gremlin', 'info'], 'Starting kibi gremlin server');

    var config = self.server.config();

    var esHost = config.get('elasticsearch.url').split(':')[1].substring(2);
    var esTransportPort = config.get('kibi_core.es_transport_port');
    var esClusterName = config.get('kibi_core.es_cluster_name');

    self.gremlinServer = childProcess.spawn('java',
      ['-jar', 'gremlin-es2-server-0.1.0.jar', '--elasticNodeHost="' + esHost
      + '" --elasticNodePort="' + esTransportPort + '" --elasticClusterName="' + esClusterName + '"']);

    var counter = 15;
    var timeout = 5000;
    var serverLoaded = false;
    self.ping = function (counter) {
      setTimeout(function () {
        var pingResponse = self._ping();
        if (pingResponse === true) {
          self.server.log(['gremlin', 'info'], 'Kibi gremlin-server running at http://localhost:8080');
          self.initialized = true;
          fulfill({ message: 'Kibi gremlin-server started successfully.' });
        } else if (counter === 0) {
          self.server.log(['gremlin', 'error'], 'The kibi gremlin-server did not start correctly');
          reject(new Error('The kibi gremlin-server did not start correctly'));
          return false;
        } else {
          self.server.log(['gremlin', 'warning'], 'Waiting the kibi gremlin-server');
          counter--;
          setTimeout(self.ping(counter), timeout);
        }
      }, timeout);
    };
    self.ping(counter);

  });
};

GremlinServerHandler.prototype.stop = function () {
  var self = this;

  return new Promise(function (fulfill, reject) {
    self.server.log(['gremlin', 'info'], 'Stopping kibi gremlin server');

    var exit = self.gremlinServer.kill('SIGINT');
    if (exit) {
      self.server.log(['gremlin', 'info'], 'gremlin-server exited successfully');
      fulfill(true);
    } else {
      self.server.log(['gremlin', 'error'], 'gremlin-server got an error while shutting down');
      reject(new Error('gremlin-server got an error while shutting down'));
    }
  });
};

GremlinServerHandler.prototype._ping = function () {
  var self = this;

  self.pingResponse;
  http.get(
    {
      host: '127.0.0.1',
      port: 8080,
      path: '/ping'
    },
    function (res) {
      res.on('data', function (data) {
        var jsonResp = JSON.parse(data.toString());
        if (jsonResp.status === 'ok') {
          self.pingResponse = true;
        } else {
          self.pingResponse = false;
        }
      });
    }
  ).on('error', function (e) {
    self.pingResponse = false;
  });
  return self.pingResponse;
};

module.exports = GremlinServerHandler;
