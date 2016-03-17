var childProcess = require('child_process');
var fs = require('fs');
var Promise = require('bluebird');
var rp = require('request-promise');
var http = require('http');
var path = require('path');
var _ = require('lodash');

function GremlinServerHandler(server) {
  this.gremlinServer = null;
  this.initialized = false;
  this.server = server;
  this.client = server.plugins.elasticsearch.client;
}

GremlinServerHandler.prototype.start = function () {
  var self = this;

  if (self.initialized === true) {
    return Promise.resolve({
      message: 'GremlinServerHandler already initialized'
    });
  }

  self.server.log(['gremlin', 'info'], 'Starting the Kibi gremlin server');
  return new Promise((fulfill, reject) => {
    var elasticsearchStatus = self.server.plugins.elasticsearch.status;

    elasticsearchStatus.on('change', function (prev, prevmsg) {
      if (elasticsearchStatus.state === 'green') {
        self.client.nodes.info({ nodeId: '_local' }).then(function (response) {
          var esTransportAddress = null;
          _.each(response.nodes, (node) => {
            esTransportAddress = node.transport_address;
          });
          if (!esTransportAddress) {
            reject(new Error('Unable to get the transport address'));
            return;
          }

          var config = self.server.config();
          var esClusterName = response.cluster_name;
          var gremlinServerPath = config.get('kibi_core.gremlin_server_path');

          if (!path.isAbsolute(gremlinServerPath)) {
            var rootDir = path.normalize(__dirname + path.sep + '..' + path.sep + '..' + path.sep + '..' + path.sep);
            var gremlinDirtyDir = path.join(rootDir, gremlinServerPath);
            gremlinServerPath = path.resolve(path.normalize(gremlinDirtyDir));
          }

          var loggingFilePath = path.parse(gremlinServerPath).dir + path.sep + 'gremlin-es2-server-log.properties';

          self.gremlinServer = childProcess.spawn('java', [
            '-jar', gremlinServerPath,
            '--elasticNodeHost=' + esTransportAddress.split(':')[0],
            '--elasticNodePort=' + esTransportAddress.split(':')[1],
            '--elasticClusterName=' + esClusterName,
            '--logging.config=' + loggingFilePath
          ]);

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
        }).catch(reject);
      }
    });
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
