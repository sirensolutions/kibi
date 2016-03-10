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
    self.server.log(['gremlin', 'info'], 'Starting the Kibi gremlin server');

    var config = self.server.config();

    var esHost = config.get('elasticsearch.url').split(':')[1].substring(2);
    var esTransportPort = config.get('kibi_core.es_transport_port');
    var esClusterName = config.get('kibi_core.es_cluster_name');
    var gremlinServerPath = config.get('kibi_core.gremlin_server_path');
    var loggingFilePath = gremlinServerPath.replace(/-[^-]*$/, '') + '/';

    self.gremlinServer = childProcess.spawn('java',
      [
        '-jar', gremlinServerPath,
        '--elasticNodeHost=' + esHost,
        '--elasticNodePort=' + esTransportPort,
        '--elasticClusterName=' + esClusterName,
        '-Dlogging.config=' + loggingFilePath + 'gremlin-es2-server-log.properties'
      ]
    );

    var counter = 15;
    var timeout = 5000;
    var serverLoaded = false;
    self.ping = function (counter) {
      if (counter > 0) {
        setTimeout(function () {
          self._ping()
          .then(function (resp) {
            var jsonResp = JSON.parse(resp.toString());
            if (jsonResp.status === 'ok') {
              self.server.log(['gremlin', 'info'], 'Kibi gremlin server running at http://localhost:8080');
              self.initialized = true;
              fulfill({ message: 'The Kibi gremlin server started successfully.' });
            } else {
              self.server.log(['gremlin', 'warning'], 'Waiting for the Kibi gremlin server');
              counter--;
              setTimeout(self.ping(counter), timeout);
            }
          })
          .catch(function (err) {
            self.server.log(['gremlin', 'warning'], 'Waiting for the Kibi gremlin server');
            counter--;
            setTimeout(self.ping(counter), timeout);
          });
        }, timeout);
      } else {
        self.server.log(['gremlin', 'error'], 'The Kibi gremlin server did not start correctly');
        reject(new Error('The Kibi gremlin server did not start correctly'));
      }
    };
    self.ping(counter);

  });
};

GremlinServerHandler.prototype.stop = function () {
  var self = this;

  return new Promise(function (fulfill, reject) {
    self.server.log(['gremlin', 'info'], 'Stopping the Kibi gremlin server');

    var exitCode = self.gremlinServer.kill('SIGINT');
    if (exitCode) {
      self.server.log(['gremlin', 'info'], 'The Kibi gremlin server exited successfully');
      fulfill(true);
    } else {
      self.server.log(['gremlin', 'error'], 'The Kibi gremlin server exited with non zero status: ' + exitCode);
      reject(new Error('The Kibi gremlin server exited with non zero status: ' + exitCode));
    }
  });
};

GremlinServerHandler.prototype._ping = function () {
  return rp({
    method: 'GET',
    uri: 'http://127.0.0.1:8080/ping'
  });
};

module.exports = GremlinServerHandler;
