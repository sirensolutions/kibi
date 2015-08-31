var _       = require('lodash');
var os      = require('os');
var config  = require('../../config');

var _endsWith = function (s, suffix) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};


function JdbcHelper() {
}


JdbcHelper.prototype.getRelativePathToSindicetechFolder = function () {
  var pathToSindicetechFolder = '';
  if (os.platform().indexOf('win') === 0) {
    //windows
    if (_endsWith(__dirname, '\\src\\server\\lib\\sindicetech')) {
      // development
      pathToSindicetechFolder = '..\\..\\..\\..\\';
    } else if (_endsWith(__dirname, '\\lib\\sindicetech')) {
      // production
      pathToSindicetechFolder = '..\\..\\';
    }
  } else {
    //unix
    if (_endsWith(__dirname, '/src/server/lib/sindicetech')) {
      // development
      pathToSindicetechFolder = '../../../../';
    } else if (_endsWith(__dirname, '/lib/sindicetech')) {
      // production
      pathToSindicetechFolder = '../../';
    }
  }
  return pathToSindicetechFolder;
};

JdbcHelper.prototype.getAbsolutePathToSindicetechFolder = function () {
  var pathToSindicetechFolder = '';
  if (os.platform().indexOf('win') === 0) {
    //windows
    if (_endsWith(__dirname, '\\src\\server\\lib\\sindicetech')) {
      // development
      pathToSindicetechFolder = __dirname.replace(/src\\server\\lib\\sindicetech$/, '');
    } else if (_endsWith(__dirname, '\\lib\\sindicetech')) {
      // production
      pathToSindicetechFolder = __dirname.replace(/lib\\sindicetech$/, '');
    }
  } else {
    //unix
    if (_endsWith(__dirname, '/src/server/lib/sindicetech')) {
      // development
      pathToSindicetechFolder = __dirname.replace(/src\/server\/lib\/sindicetech$/, '');
    } else if (_endsWith(__dirname, '/lib/sindicetech')) {
      // production
      pathToSindicetechFolder = __dirname.replace(/lib\/sindicetech$/, '');
    }
  }
  return pathToSindicetechFolder;
};

JdbcHelper.prototype.prepareJdbcConfig = function (datasourceId) {

  var pathToSindicetechFolder = this.getAbsolutePathToSindicetechFolder();
  var libpath = '';
  var libs = [];
  var conf = config.kibana.datasources[datasourceId];

  if (os.platform().indexOf('win') === 0) {
    //windows
    libpath = pathToSindicetechFolder + conf.libpath.replace(/\//g, '\\');
    // just in case of any double backslashes replace them to single ones
    libpath = libpath.replace(/\\{2}/g, '\\');
    libs = _.map(conf.libs, function (libpath) {
      return pathToSindicetechFolder + libpath.replace(/\//g, '\\');
    });
  } else {
    //unix
    libpath = conf.libpath.indexOf('/') === 0 ? conf.libpath : pathToSindicetechFolder + conf.libpath;
    libs = _.map(conf.libs, function (libpath) {
      return libpath.indexOf('/') === 0 ? libpath : pathToSindicetechFolder + libpath;
    });
  }

  var jdbcConfig = {
    libpath: libpath,
    libs: libs,
    drivername: conf.drivername,
    url: conf.url,
    user: conf.user,
    password: conf.password
  };
  return jdbcConfig;

};

JdbcHelper.prototype.prepareJdbcPaths = function () {
  var libpaths = [];
  var libs = [];
  for (var datasourceId in config.kibana.datasources) {
    if (config.kibana.datasources.hasOwnProperty(datasourceId)) {
      var conf = config.kibana.datasources[datasourceId];
      if (conf.type === 'jdbc') {
        var jdbcConfig = this.prepareJdbcConfig(datasourceId);
        libpaths.push(jdbcConfig.libpath);
        libs = libs.concat(jdbcConfig.libs);
      }
    }
  }
  return {
    libpaths: libpaths,
    libs: libs
  };
};



module.exports = new JdbcHelper();
