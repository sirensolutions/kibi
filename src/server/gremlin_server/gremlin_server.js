var childProcess = require('child_process');
var fs = require('fs');
var Promise = require('bluebird');

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
    self.server.log(['pid', 'info'], 'Starting kibi gremlin server');

    var config = self.server.config();

    var esHost = config.get('elasticsearch.url').split(':')[1].substring(2);
    var esTransportPort = config.get('kibi_core.es_transport_port');
    var esClusterName = config.get('kibi_core.es_cluster_name');

    var gremlinShellCommand = 'java -jar gremlin-es2-server-0.1.0.jar --elasticNodeHost="' + esHost
                           + '" --elasticNodePort="' + esTransportPort + '" --elasticClusterName="' + esClusterName + '"';
    self.gremlinServer = childProcess.spawn('sh', ['-c', gremlinShellCommand], { stdio: 'pipe', detached: true });

    // add timer
    var to = setTimeout(function () {
      reject(new Error('An error has occurred while starting the kibi gremlin server'));
    }, 30000);

    self.gremlinServer.stdout.on('data', function (data) {
      var stringData = data.toString().trim();
      if (stringData.length > 0) {
        if (stringData.indexOf('Started Application in') > -1) {
          // stop timer
          clearTimeout(to);
          fulfill({ message: 'GremlinServer started successfully.' });
        }
      }
    });

    self.gremlinServer.on('close', function (code) {
      if (code === 0) {
        fulfill(code);
      } else {
        reject(new Error('gramlin-server exited with non zero status: [' + code + ']'));
      }
    });
  });
};

GremlinServerHandler.prototype.stop = function () {
  var self = this;
  return new Promise(function (fulfill, reject) {
    self.server.log(['pid', 'info'], 'Stopping kibi gremlin server');

    childProcess.exec('kill -INT -' + self.gremlinServer.pid, function (error, stdout, stderr) {
      if (error !== null) {
        reject(error);
      }

      fulfill(true);
    });
  });
};

module.exports = GremlinServerHandler;
