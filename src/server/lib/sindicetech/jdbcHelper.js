var _            = require('lodash');
var Promise      = require('bluebird');
var config       = require('../../config');
var cryptoHelper = require('./crypto_helper');
var indexHelper  = require('../kibi/index_helper');
var logger       = require('../logger');
var os           = require('os');

var _endsWith = function (s, suffix) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

function JdbcHelper() {
}

// this method exists purely to be able to test
// getRelativePathToNodeModulesFolder and getAbsolutePathToSindicetechFolder
JdbcHelper.prototype._getDirName = function () {
  return __dirname;
};


JdbcHelper.prototype.getRelativePathToNodeModulesFolder = function () {
  var currentDir = this._getDirName();
  var pathToNodeModulesFolder = '';
  if (os.platform().indexOf('win') === 0) {
    //windows
    if (_endsWith(currentDir, '\\src\\server\\lib\\sindicetech')) {
      // development
      pathToNodeModulesFolder = '..\\..\\..\\..\\node_modules\\';
    } else if (_endsWith(currentDir, '\\src\\lib\\sindicetech')) {
      // production
      pathToNodeModulesFolder = '..\\..\\node_modules\\';
    }
  } else {
    //unix
    if (_endsWith(currentDir, '/src/server/lib/sindicetech')) {
      // development
      pathToNodeModulesFolder = '../../../../node_modules/';
    } else if (_endsWith(currentDir, '/src/lib/sindicetech')) {
      // production
      pathToNodeModulesFolder = '../../node_modules/';
    }
  }
  return pathToNodeModulesFolder;
};

JdbcHelper.prototype.getAbsolutePathToSindicetechFolder = function () {
  var currentDir = this._getDirName();
  var pathToSindicetechFolder = '';
  if (os.platform().indexOf('win') === 0) {
    //windows
    if (_endsWith(currentDir, '\\src\\server\\lib\\sindicetech')) {
      // development
      pathToSindicetechFolder = currentDir.replace(/src\\server\\lib\\sindicetech$/, '');
    } else if (_endsWith(currentDir, '\\src\\lib\\sindicetech')) {
      // production
      pathToSindicetechFolder = currentDir.replace(/src\\lib\\sindicetech$/, '');
    }
  } else {
    //unix
    if (_endsWith(currentDir, '/src/server/lib/sindicetech')) {
      // development
      pathToSindicetechFolder = currentDir.replace(/src\/server\/lib\/sindicetech$/, '');
    } else if (_endsWith(currentDir, '/src/lib/sindicetech')) {
      // production
      pathToSindicetechFolder = currentDir.replace(/src\/lib\/sindicetech$/, '');
    }
  }
  return pathToSindicetechFolder;
};


JdbcHelper.prototype.prepareJdbcConfig = function (conf) {
  var pathToSindicetechFolder = this.getAbsolutePathToSindicetechFolder();
  var libpath = '';
  var libs = [];

  if (os.platform().indexOf('win') === 0) {

    //windows
    var winAbspathRegex = /^[A-Z]:\\/;
    libpath = winAbspathRegex.test(conf.libpath) ?
      conf.libpath.replace(/\//g, '\\') :
      pathToSindicetechFolder + conf.libpath.replace(/\\{2}/g, '\\').replace(/\//g, '\\');

    if (conf.libs) {
      libs = _.map(conf.libs, function (libpath) {
        return winAbspathRegex.test(libpath) ?
          libpath.replace(/\//g, '\\') :
          pathToSindicetechFolder + libpath.replace(/\\{2}/g, '\\').replace(/\//g, '\\');
      });
    }
  } else {
    //unix
    libpath = conf.libpath.indexOf('/') === 0 ? conf.libpath : pathToSindicetechFolder + conf.libpath;
    if (conf.libs) {
      libs = _.map(conf.libs, function (libpath) {
        return libpath.indexOf('/') === 0 ? libpath : pathToSindicetechFolder + libpath;
      });
    }
  }

  var jdbcConfig = {
    libpath: libpath,
    libs: libs,
    drivername: conf.drivername,
    url: conf.connection_string,
    properties: []
  };

  if (conf.username) {
    jdbcConfig.properties.push(['user', conf.username]);
  }

  // TODO: IMPROVE ME
  // here it is fine as password is always encrypted
  // but we need a better method to decrypt all parameters based on schema
  // however when loading jdbc libs the datasource was not created yet so there is no datasourceClazz available
  // so we would have to get the schema ourselves here
  if (conf.password) {
    jdbcConfig.properties.push([
      'password',
      cryptoHelper.decrypt(config.kibana.datasource_encryption_key, conf.password)
    ]);
  }
  return jdbcConfig;

};

JdbcHelper.prototype.prepareJdbcPaths = function () {
  var self = this;

  return new Promise(function (resolve) {

    logger.info('Preparing JDBC library paths');

    var ret = {
      libpaths: [],
      libs: []
    };

    indexHelper.getDatasources().then(function (datasources) {

      _.each(datasources, function (datasource) {
        if (datasource._source.datasourceType.indexOf('_jdbc') > 0) {
          if (datasource._source.datasourceParams) {
            var params = {};
            try {
              params = JSON.parse(datasource._source.datasourceParams);
            } catch (error) {
              logger.error(error);
              return;
            }
            var jdbcConfig = self.prepareJdbcConfig(params);
            ret.libpaths.push(jdbcConfig.libpath);
            ret.libs = ret.libs.concat(jdbcConfig.libs);
          }
        }
      });

      logger.info('The following libraries will be loaded:');
      logger.info(JSON.stringify(ret, null, ' '));

      resolve(ret);
    }).catch(function (err) {
      var msg =
        'An error occurred while fetching datasources from ' + config.kibana.kibana_index + '\n' +
        '. This is fine if you just started kibi first time and ' +
        ' the index does not yet exists.\n' +
        'Please check the logs if the warning persists after restarting Kibi.';
      console.log(msg);
      logger.error(err);
      resolve(ret);
    });

  });

};

module.exports = JdbcHelper;
