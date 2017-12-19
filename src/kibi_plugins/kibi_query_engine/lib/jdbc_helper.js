import _ from 'lodash';
import os from 'os';
import path from 'path';
import cryptoHelper from './crypto_helper';
import IndexHelper from './index_helper';
import logger from './logger';
import kibiUtils from 'kibiutils';

const _endsWith = function (s, suffix) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

function JdbcHelper(server) {
  this.server = server;
  this.config = server.config();
  this.indexHelper = new IndexHelper(server);
  this.log = logger(server, 'jdbc_helper');
}

// this method exists purely to be able to test
// getAbsolutePathToSindicetechFolder
JdbcHelper.prototype._getDirName = function () {
  return __dirname;
};


JdbcHelper.prototype.getAbsolutePathToSindicetechFolder = function () {
  const currentDir = this._getDirName();
  let pathToSindicetechFolder = '';
  if (os.platform().indexOf('win') === 0) {
    //windows
    if (_endsWith(currentDir, '\\src\\plugins\\kibi_query_engine\\lib')) {
      // development
      pathToSindicetechFolder = currentDir.replace(/src\\plugins\\kibi_query_engine\\lib$/, '');
    } else if (_endsWith(currentDir, '\\src\\plugins\\kibi_query_engine\\lib')) {
      // production
      pathToSindicetechFolder = currentDir.replace(/src\\plugins\\kibi_query_engine\\lib$/, '');
    }
  } else {
    //unix
    if (_endsWith(currentDir, '/src/plugins/kibi_query_engine/lib')) {
      // development
      pathToSindicetechFolder = currentDir.replace(/src\/plugins\/kibi_query_engine\/lib$/, '');
    } else if (_endsWith(currentDir, '/src/plugins/kibi_query_engine/lib')) {
      // production
      pathToSindicetechFolder = currentDir.replace(/src\/plugins\/kibi_query_engine\/lib$/, '');
    }
  }
  return pathToSindicetechFolder;
};


JdbcHelper.prototype.prepareJdbcConfig = function (conf) {

  const self = this;
  let libs = [];

  // Note: here we have to convert a comma separated libs into array
  if (conf.libs) {
    libs = _.map(conf.libs.split(','), function (s) {
      return s.trim();
    });
  }

  const pathToSindicetechFolder = this.getAbsolutePathToSindicetechFolder();
  let libpath = '';

  if (os.platform().indexOf('win') === 0) {
    //windows
    const winAbspathRegex = /^[A-Z]:\\/;
    libpath = winAbspathRegex.test(conf.libpath) ?
      conf.libpath.replace(/\//g, '\\') :
      pathToSindicetechFolder + conf.libpath.replace(/\\{2}/g, '\\').replace(/\//g, '\\');

    // if the libpath does not ends with \\ ad it there
    function addBackslashToTheEnd(s) {
      if (s.endsWith('\\')) {
        return s;
      }
      return s + '\\';
    }

    if (libs) {
      libs = _.map(libs, function (lib) {

        return winAbspathRegex.test(lib) ?
          lib.replace(/\//g, '\\') :
          addBackslashToTheEnd(libpath) + lib;
      });
    }

  } else {
    //unix

    libpath = conf.libpath.indexOf('/') === 0 ? conf.libpath : path.posix.join(pathToSindicetechFolder, conf.libpath);
    if (libs) {
      libs = _.map(libs, function (lib) {
        return lib.indexOf('/') === 0 ? lib  : path.posix.join(libpath, lib);
      });
    }
  }

  const jdbcConfig = {
    libpath: libpath,
    libs: libs,
    drivername: conf.drivername,
    url: conf.connection_string,
    properties: {},
  };

  if (conf.username) {
    jdbcConfig.properties.user = conf.username;
    jdbcConfig.user = conf.username;
  }

  // TODO: IMPROVE ME
  // here it is fine as password is always encrypted
  // but we need a better method to decrypt all parameters based on schema
  // however when loading jdbc libs the datasource was not created yet so there is no datasourceClazz available
  // so we would have to get the schema ourselves here
  if (conf.password) {
    jdbcConfig.properties.password = cryptoHelper.decrypt(self.config.get('kibi_core.datasource_encryption_key'), conf.password);
    jdbcConfig.password = cryptoHelper.decrypt(self.config.get('kibi_core.datasource_encryption_key'), conf.password);
  }
  return jdbcConfig;
};

JdbcHelper.prototype.prepareJdbcPaths = function () {
  const self = this;

  return new Promise(function (resolve, reject) {

    self.log.info('Preparing JDBC library paths');

    const ret = {
      libpaths: [],
      libs: []
    };

    self.indexHelper.getDatasources().then(function (datasources) {

      _.each(datasources, function (datasource) {
        if (kibiUtils.isJDBC(datasource._source.datasourceType)) {
          if (datasource._source.datasourceParams) {
            let params = {};
            try {
              params = JSON.parse(datasource._source.datasourceParams);
            } catch (error) {
              self.log.error(error);
              return;
            }
            const jdbcConfig = self.prepareJdbcConfig(params);
            ret.libpaths.push(jdbcConfig.libpath);
            ret.libs = ret.libs.concat(jdbcConfig.libs);
          }
        }
      });

      self.log.info('The following libraries will be loaded: ' + JSON.stringify(ret, null, ' '));

      resolve(ret);
    }).catch(function (err) {
      const msg =
        'An error occurred while fetching datasources from ' + self.config.get('kibana.index') + ' index\n' +
        '. This is fine if you just started kibi first time and ' +
        ' the index does not yet exists.\n' +
        err.message + '\n' +
        'Please check the logs if the warning persists after restarting Kibi.';
      self.log.error(msg, err);
      resolve(ret);
    });

  });

};


module.exports = JdbcHelper;
