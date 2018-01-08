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
  this.javaCheck = { checked: false, isOk: null };
  this.callWithInternalUser = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
}

function startServer(self, fulfill, reject) {
  const config = self.server.config();
  self.url = config.get('investigate_core.gremlin_server.url');
  self._isAnotherGremlinRunning()
  .then(() => {
    const msg = 'Another Siren Gremlin Server was found running. Won\'t start another instance.';
    self.server.log(['gremlin', 'warning'], msg);
    fulfill({ message: msg });
  })
  .catch(() => {
    if (config.has('investigate_core.gremlin_server.path')) {
      let gremlinServerPath = config.get('investigate_core.gremlin_server.path');

      isJavaVersionOk(self).then(function () {

        if (config.has('investigate_core.gremlin_server.ssl.ca')) {
          const ca = config.get('investigate_core.gremlin_server.ssl.ca');
          if (ca) {
            try {
              self.ca = fs.readFileSync(ca);
            } catch (error) {
              const message = 'The configuration property investigate_core.gremlin_server.ca ' +
                               'does not point to a readable CA file.';
              reject(new Error(message));
            }
          }
        }

        if (path.parse(gremlinServerPath).ext !== '.jar') {
          reject(new Error('The configuration property investigate_core.gremlin_server.path does not point to a jar file'));
        }

        if (!path.isAbsolute(gremlinServerPath)) {
          const rootDir = path.normalize(__dirname + path.sep + '..' + path.sep + '..' + path.sep + '..' + path.sep);
          const gremlinDirtyDir = path.join(rootDir, gremlinServerPath);
          gremlinServerPath = path.resolve(path.normalize(gremlinDirtyDir));
        }

        return fs.access(gremlinServerPath, fs.F_OK, (error) => {
          if (error !== null) {
            reject(new Error('The Siren Gremlin Server jar file was not found. Please check the configuration'));
          } else {
            const serverURL = url.parse(self.url);
            const esUrl = config.get('elasticsearch.url');

            const args = [
              '-jar', gremlinServerPath,
              '-Djava.security.egd=file:/dev/./urandom',
              '--elasticsearch.url=' + esUrl,
              '--server.port=' + serverURL.port
            ];
            if (serverURL.hostname !== '0.0.0.0') {
              args.push('--server.address=' + serverURL.hostname);
            }

            if (config.has('investigate_core.gremlin_server.debug_remote')) {
              const gremlinServerRemoteDebug = config.get('investigate_core.gremlin_server.debug_remote');
              if (gremlinServerRemoteDebug) {
                args.unshift(gremlinServerRemoteDebug);
              }
            }

            if (config.has('investigate_core.gremlin_server.log_conf_path')) {
              const logConfigPath = config.get('investigate_core.gremlin_server.log_conf_path');
              if (logConfigPath) {
                args.push('--logging.config=' + logConfigPath);
              }
            }

            if (config.has('elasticsearch.ssl.certificateAuthorities')) {
              const elasticsearchCAs = config.get('elasticsearch.ssl.certificateAuthorities');
              _.each(elasticsearchCAs, (ca) => {
                args.push('--elasticsearch.ssl.ca=' + ca);
              });
            }

            if (config.has('elasticsearch.ssl.verificationMode')) {
              const verificationMode = config.get('elasticsearch.ssl.verificationMode');
              switch (verificationMode) {
                case 'none':
                  args.push('--elasticsearch.ssl.verify=false');
                  break;
                case 'certificate':
                case 'full':
                  args.push('--elasticsearch.ssl.verify=true');
                  break;
                default:
                  const message = `Unknown ssl verificationMode: ${verificationMode} ` +
                                   'while starting the Siren Gremlin Server';
                  reject(new Error(message));
              }
            }

            if (config.has('investigate_core.gremlin_server.ssl.key_store') &&
              config.get('investigate_core.gremlin_server.ssl.key_store')) {
              const sslKeyStore = config.get('investigate_core.gremlin_server.ssl.key_store');
              const sslKeyStorePsw = config.get('investigate_core.gremlin_server.ssl.key_store_password');
              if (!sslKeyStorePsw) {
                const message = `The Siren Gremlin Server keystore password was not specified; ` +
                                 'in investigate_core.gremlin_server.ssl.key_store_password';
                reject(new Error(message));
              }
              if (sslKeyStore && sslKeyStorePsw) {
                args.push('--server.ssl.enabled=true');
                args.push('--server.ssl.key-store=' + sslKeyStore);
                args.push('--server.ssl.key-store-password=' + sslKeyStorePsw);
              }
            } else if (config.has('investigate_access_control.enabled') && config.get('investigate_access_control.enabled')) {
              const msg = 'Since you are using access control, you must enable HTTPS support in Siren Gremlin Server ' +
                'by configuring the key store in investigate.yml\n' +
                'The following properties are required:\n' +
                'investigate_core.gremlin_server.ssl.key_store\n' +
                'investigate_core.gremlin_server.ssl.key_store_password\n' +
                'investigate_core.gremlin_server.ssl.ca (optional)';
              reject(new Error(msg));
            }

            if (config.has('elasticsearch.username')) {
              const esUsername = config.get('elasticsearch.username');
              if (esUsername) {
                args.push('--elasticsearch.username=' + esUsername);
              }
            }

            if (config.has('elasticsearch.password')) {
              const esUsername = config.get('elasticsearch.password');
              if (esUsername) {
                args.push('--elasticsearch.password=' + esUsername);
              }
            }

            if (config.has('kibana.index')) {
              const kibanaIndex = config.get('kibana.index');
              if (kibanaIndex) {
                args.push('--kibi.index=' + kibanaIndex);
              }
            }

            self.server.log(['gremlin', 'info'], 'Starting the Siren Gremlin Server');
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
                      self.server.log(['gremlin', 'info'], 'Siren Gremlin Server running at ' + self.url);
                      self.initialized = true;
                      fulfill({ message: 'The Siren gremlin server started successfully.' });
                    } else {
                      self.server.log(['gremlin', 'warning'], 'Waiting for the Siren Gremlin Server');
                      counter--;
                      setTimeout(() => self.ping(counter), timeout);
                    }
                  })
                  .catch(function (err) {
                    if (err.error.code !== 'ECONNREFUSED') {
                      self.server.log(['gremlin', 'error'], 'Failed to ping the Siren Gremlin Server: ' + err.message);
                    } else {
                      self.server.log(['gremlin', 'warning'], 'Waiting for the Siren Gremlin Server');
                    }
                    counter--;
                    setTimeout(() => self.ping(counter), timeout);
                  });
                }, counter === maxCounter ? initialTimeout : timeout);
              } else {
                self.gremlinServer.kill('SIGINT');
                reject(new Error('The Siren Gremlin Server did not start correctly'));
              }
            };
            self.ping(counter);
          }
        });
      })
      .catch(reject);
    } else {
      const message = 'The Siren Gremlin Server jar file was not found. Please check the ' +
                       'value of the investigate_core.gremlin_server.path configuration property.';
      reject(new Error(message));
    }
  });
};

function isJavaVersionOk(self) {
  return new Promise((fulfill, reject) => {
    const spawn = require('child_process').spawn('java', ['-version']);
    spawn.on('error', function (err) {
      if (err.code === 'ENOENT') {
        self.server.log(['gremlin', 'error'], 'Java not found, please ensure that '
          + 'JAVA_HOME is set correctly and the Java binaries are in the application path');
        self.javaCheck = { checked: true, isOk: false };
        reject(new Error('Java not found'));
      }
    });
    spawn.stderr.on('data', function (data) {
      const err = self._checkJavaVersionString(data);
      if (err) {
        reject(new Error(err));
      } else {
        fulfill(true);
      }
    });
  });
}

GremlinServerHandler.prototype._isAnotherGremlinRunning = function () {
  return new Promise((fulfill, reject) => {
    this._ping()
    .then(function (resp) {
      const jsonResp = JSON.parse(resp.toString());
      if (jsonResp.status === 'ok') {
        fulfill();
      } else {
        reject();
      }
    })
    .catch(reject);
  });
};

GremlinServerHandler.prototype._checkJavaVersionString = function (string) {
  if (!this.javaCheck.checked) {
    let err;
    const versionLine = string.toString().split(os.EOL)[0];
    //[string, major, minor, patch, update, ...]
    const matches = versionLine.match(/(\d+?)\.(\d+?)\.(\d+?)(?:_(\d+))?/);
    if (matches) {
      if (matches.length >= 2 && matches[2] === '8') {
        this.javaCheck.isOk = true;
      } else {
        this.javaCheck.isOk = false;
        err = 'Java version is lower than the requested 1.8. The Siren Gremlin Server needs Java 8 to run';
      }
    } else {
      this.javaCheck.isOk = false;
      err = 'An error occurred while checking the installed Java version';
    }
    this.javaCheck.checked = true;
    return err;
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
    startServer(self, fulfill, reject);
  });
};

GremlinServerHandler.prototype.stop = function () {
  const self = this;

  if (self.initialized) {
    self.initialized = false;
    return new Promise(function (fulfill, reject) {
      self.server.log(['gremlin', 'info'], 'Stopping the Siren Gremlin Server');

      if (self.gremlinServer) {
        const exitCode = self.gremlinServer.kill('SIGINT');
        if (exitCode) {
          self.server.log(['gremlin', 'info'], 'The Siren Gremlin Server exited successfully');
          fulfill(true);
        } else {
          self.server.log(['gremlin', 'error'], 'The Siren Gremlin Server exited with non zero status: ' + exitCode);
          reject(new Error('The Siren Gremlin Server exited with non zero status: ' + exitCode));
        }
      } else {
        fulfill(true);
      }
    });
  } else {
    // If the server did not start no need to kill it
    return Promise.resolve(true);
  }
};

GremlinServerHandler.prototype.isInitialized = function () {
  return this.initialized;
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

/*
 * Used in tests.
 */
GremlinServerHandler.prototype._getJavaCheck = function () {
  return this.javaCheck;
};

module.exports = GremlinServerHandler;
