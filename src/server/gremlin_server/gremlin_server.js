const childProcess = require('child_process');
const fs = require('fs');
const Promise = require('bluebird');
const rp = require('request-promise');
const http = require('http');
const path = require('path');
const _ = require('lodash');
const os = require('os');
const url = require('url');

function GremlinServerHandler(server) {
  this.gremlinServer = null;
  this.initialized = false;
  this.server = server;
  this.javaChecked = false;
}

function startServer(self, fulfill, reject) {
  const config = self.server.config();
  let gremlinServerPath = config.get('kibi_core.gremlin_server.path');
  let gremlinServerRemoteDebug = config.get('kibi_core.gremlin_server.debug_remote');

  if (gremlinServerPath) {
    // regex for ipv4 ip+port
    const re = /.*?([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:[0-9]*).*/;

    isJavaVersionOk(self).then(function () {
      self.server.plugins.elasticsearch.client.nodes.info({ nodeId: '_local' }).then(function (response) {
        let esTransportAddress = null;
        let esTransportAddressCollectedValues = [];
        _.each(response.nodes, (node) => {
          if (node.transport_address) {
            // transport_address can come in many different flavours
            // currently we support this ones for ipv4:
            // 127.0.0.1:9300
            // demo.example.com/127.0.0.1:9300
            // inet[/127.0.0.1:9303]
            esTransportAddressCollectedValues.push(node.transport_address);
            const matches = node.transport_address.match(re);
            if (matches.length === 2 && matches[1].indexOf(node.ip) === 0) {
              esTransportAddress = matches[1];
              return false; // to break the loop
            }
          }
        });
        if (!esTransportAddress) {
          return Promise.reject(
            new Error(
              'Unable to get the transport address.\n' +
              'Currently supported values are:\n' +
              '127.0.0.1:9300\n' +
              'host.com/127.0.0.1:9300\n' +
              'inet[/127.0.0.1:9303]\n' +
              'While values returned by the cluster are:\n' +
              JSON.stringify(esTransportAddressCollectedValues, null, '')
            )
          );
        }

        const esClusterName = response.cluster_name;

        if (config.get('kibi_core.gremlin_server.ssl.ca')) {
          self.ca = fs.readFileSync(config.get('kibi_core.gremlin_server.ssl.ca'));
        }

        if (path.parse(gremlinServerPath).ext !== '.jar') {
          self.server.log(['gremlin', 'error'], 'The configuration property kibi_core.gremlin_server.path does not point to a jar file');
          return Promise.reject(new Error('The configuration property kibi_core.gremlin_server.path does not point to a jar file'));
        }

        if (!path.isAbsolute(gremlinServerPath)) {
          const rootDir = path.normalize(__dirname + path.sep + '..' + path.sep + '..' + path.sep + '..' + path.sep);
          const gremlinDirtyDir = path.join(rootDir, gremlinServerPath);
          gremlinServerPath = path.resolve(path.normalize(gremlinDirtyDir));
        }

        return fs.access(gremlinServerPath, fs.F_OK, (error) => {
          if (error !== null) {
            self.server.log(['gremlin', 'error'], 'The Kibi Gremlin Server jar file was not found. Please check the configuration');
            return Promise.reject(new Error('The Kibi Gremlin Server jar file was not found. Please check the configuration'));
          }

          const [ host, port, ...rest ] = esTransportAddress.split(':');
          const transportClientUsername = config.get('kibi_core.elasticsearch.transport_client.username');
          const transportClientPassword = config.get('kibi_core.elasticsearch.transport_client.password');
          const elasticAuthPlugin = config.get('kibi_core.elasticsearch.auth_plugin');
          let transportClientSSLCaKeyStore = config.get('kibi_core.elasticsearch.transport_client.ssl.ca');
          if (transportClientSSLCaKeyStore) {
            transportClientSSLCaKeyStore = path.resolve(transportClientSSLCaKeyStore);
          }
          const transportClientSSLCaKeyStorePassword = config.get('kibi_core.elasticsearch.transport_client.ssl.ca_password');
          let transportClientSSLKeyStore = config.get('kibi_core.elasticsearch.transport_client.ssl.key_store');
          if (transportClientSSLKeyStore) {
            transportClientSSLKeyStore = path.resolve(transportClientSSLKeyStore);
          }
          const transportClientSSLKeyStoreAlias = config.get('kibi_core.elasticsearch.transport_client.ssl.key_store_alias');
          const transportClientSSLCaKeyStoreAlias = config.get('kibi_core.elasticsearch.transport_client.ssl.ca_alias');
          const transportClientSSLKeyStorePassword = config.get('kibi_core.elasticsearch.transport_client.ssl.key_store_password');
          const transportClientSSLHostNameVerification = config.get('kibi_core.elasticsearch.transport_client.ssl.verify_hostname');
          const transportClientSSLHostNameVerificationResolution = config.get('kibi_core.elasticsearch.transport_client.ssl' +
                                                                              '.verify_hostname_resolve');

          self.url = config.get('kibi_core.gremlin_server.url');
          const serverURL = url.parse(self.url);

          let args = [
            '-jar', gremlinServerPath,
            '--elasticNodeHost=' + host,
            '--elasticNodePort=' + port,
            '--elasticClusterName=' + esClusterName,
            '--server.port=' + serverURL.port
          ];
          if (serverURL.hostname !== '0.0.0.0') {
            args.push('--server.address=' + serverURL.hostname);
          }

          if (gremlinServerRemoteDebug) {
            args.unshift(gremlinServerRemoteDebug);
          }

          const logConfigPath = config.get('kibi_core.gremlin_server.log_conf_path');
          if (logConfigPath) {
            args.push('--logging.config=' + logConfigPath);
          }

          if (transportClientUsername) {
            args.push('--elasticTransportClientUserName=' + transportClientUsername);
            args.push('--elasticTransportClientPassword=' + transportClientPassword);
          }

          if (elasticAuthPlugin) {
            args.push('--elasticAuthPlugin=' + elasticAuthPlugin);
          }

          if (transportClientSSLCaKeyStore) {
            args.push('--elasticTransportClientCAKeyStore=' + transportClientSSLCaKeyStore);
          }

          if (transportClientSSLCaKeyStorePassword) {
            args.push('--elasticTransportClientCAKeyStorePassword=' + transportClientSSLCaKeyStorePassword);
          }

          if (transportClientSSLCaKeyStoreAlias) {
            args.push('--elasticTransportClientCACertAlias=' + transportClientSSLCaKeyStoreAlias);
          }

          if (transportClientSSLKeyStore) {
            args.push('--elasticTransportClientKeyStore=' + transportClientSSLKeyStore);
          }

          if (transportClientSSLKeyStoreAlias) {
            args.push('--elasticTransportClientCertAlias=' + transportClientSSLKeyStoreAlias);
          }

          if (transportClientSSLKeyStorePassword) {
            args.push('--elasticTransportClientKeyStorePassword=' + transportClientSSLKeyStorePassword);
          }

          if (transportClientSSLHostNameVerification) {
            args.push('--elasticTransportClientSSLHostNameVerification=true');
          } else {
            args.push('--elasticTransportClientSSLHostNameVerification=false');
          }

          if (transportClientSSLHostNameVerificationResolution) {
            args.push('--elasticTransportClientSSLHostNameVerificationResolution=true');
          } else {
            args.push('--elasticTransportClientSSLHostNameVerificationResolution=false');
          }

          if (config.get('kibi_core.gremlin_server.ssl.key_store')) {
            args.push('--server.ssl.enabled=true');
            args.push('--server.ssl.key-store=' + config.get('kibi_core.gremlin_server.ssl.key_store'));
            args.push('--server.ssl.key-store-password=' + config.get('kibi_core.gremlin_server.ssl.key_store_password'));
          } else if (config.get('server.ssl.key') && config.get('server.ssl.cert')) {
            const msg = 'Since you are using Elasticsearch Shield, you should configure the SSL for the gremlin server ' +
              'by configuring the key store in kibi.yml\n' +
              'The following properties are required:\n' +
              'kibi_core.gremlin_server.ssl.key_store\n' +
              'kibi_core.gremlin_server.ssl.key_store_password\n' +
              'kibi_core.gremlin_server.ssl.ca (optional)';
            self.server.log(['gremlin','error'], msg);
            return Promise.reject(new Error(msg));
          }

          self.server.log(['gremlin', 'info'], 'Starting the Kibi gremlin server');
          self.gremlinServer = childProcess.spawn('java', args);
          self.gremlinServer.stderr.on('data', (data) => self.server.log(['gremlin', 'error'], ('' + data).trim()));
          self.gremlinServer.stdout.on('data', (data) => self.server.log(['gremlin', 'info'], ('' + data).trim()));
          self.gremlinServer.on('error', (err) => reject);

          const maxCounter = 20;
          const initialTimeout = 10000;
          const timeout = 5000;
          const counter = maxCounter;

          self.ping = function (counter) {
            if (counter > 0) {
              setTimeout(function () {
                self._ping()
                .then(function (resp) {
                  const jsonResp = JSON.parse(resp.toString());
                  if (jsonResp.status === 'ok') {
                    self.server.log(['gremlin', 'info'], 'Kibi gremlin server running at ' + self.url);
                    self.initialized = true;
                    fulfill({ message: 'The Kibi gremlin server started successfully.' });
                  } else {
                    self.server.log(['gremlin', 'warning'], 'Waiting for the Kibi gremlin server');
                    counter--;
                    setTimeout(() => self.ping(counter), timeout);
                  }
                })
                .catch(function (err) {
                  if (err.error.code !== 'ECONNREFUSED') {
                    self.server.log(['gremlin', 'error'], 'Failed to ping the Kibi gremlin server: ' + err.message);
                  } else {
                    self.server.log(['gremlin', 'warning'], 'Waiting for the Kibi gremlin server');
                  }
                  counter--;
                  setTimeout(() => self.ping(counter), timeout);
                });
              }, counter === maxCounter ? initialTimeout : timeout);
            } else {
              self.server.log(['gremlin', 'error'], 'The Kibi gremlin server did not start correctly');
              self.gremlinServer.kill('SIGINT');
              reject(new Error('The Kibi gremlin server did not start correctly'));
            }
          };
          self.ping(counter);
        });
      }).catch(reject);
    });
  } else {
    self.server.log(['gremlin', 'warning'], 'The configuration property kibi_core.gremlin_server.path is empty');
    fulfill({ message: 'The Kibi gremlin server was not started.', error: true });
  }
};

function isJavaVersionOk(self) {
  return new Promise((fulfill, reject) => {
    const spawn = require('child_process').spawn('java', ['-version']);
    spawn.on('error', function (err) {
      self.server.log(['gremlin', 'error'], err);
    });
    spawn.stderr.on('data', function (data) {
      const result = self._checkJavaVersionString(data);
      if (result) {
        if (!result.v) {
          self.server.log(['gremlin', 'error'], result.e);
        }
        fulfill(true);
      }
    });
  });
}

GremlinServerHandler.prototype._checkJavaVersionString = function (string) {
  if (!this.javaChecked) {
    let ret = {};
    const versionLine = string.toString().split(os.EOL)[0];
    //[string, major, minor, patch, update, ...]
    const matches = versionLine.match(/(\d+?)\.(\d+?)\.(\d+?)(?:_(\d+))?/);
    if (matches) {
      if (matches.length >= 2 && matches[2] === '8') {
        ret.v = true;
      } else {
        ret.v = false;
        ret.e = 'JAVA version is lower than the requested 1.8. The Kibi Gremlin Server needs JAVA 8 to run';
      }
    } else {
      ret.v = false;
      ret.e = 'JAVA not found. Please install JAVA 8 and restart Kibi';
    }
    this.javaChecked = true;
    return ret;
  } else {
    return null;
  }
};

GremlinServerHandler.prototype.start = function () {
  const self = this;

  if (self.initialized) {
    return Promise.resolve({
      message: 'GremlinServerHandler already initialized'
    });
  }

  return new Promise((fulfill, reject) => {
    let elasticsearchStatus = self.server.plugins.elasticsearch.status;

    if (elasticsearchStatus.state === 'green') {
      startServer(self, fulfill, reject);
    }
    elasticsearchStatus.on('change', function (prev, prevmsg) {
      if (elasticsearchStatus.state === 'green') {
        if (!self.initialized) {
          startServer(self, fulfill, reject);
        } else {
          fulfill({ message: 'GremlinServerHandler already initialized' });
        }
      }
    });
  });
};

GremlinServerHandler.prototype.stop = function () {
  const self = this;

  self.initialized = false;
  return new Promise(function (fulfill, reject) {
    self.server.log(['gremlin', 'info'], 'Stopping the Kibi gremlin server');

    if (self.gremlinServer) {
      let exitCode = self.gremlinServer.kill('SIGINT');
      if (exitCode) {
        self.server.log(['gremlin', 'info'], 'The Kibi gremlin server exited successfully');
        fulfill(true);
      } else {
        self.server.log(['gremlin', 'error'], 'The Kibi gremlin server exited with non zero status: ' + exitCode);
        reject(new Error('The Kibi gremlin server exited with non zero status: ' + exitCode));
      }
    } else {
      fulfill(true);
    }
  });
};

GremlinServerHandler.prototype._ping = function () {
  const options = {
    method: 'GET',
    uri: this.url + '/ping'
  };
  if (this.ca) {
    options.ca = this.ca;
  }
  return rp(options);
};

module.exports = GremlinServerHandler;
