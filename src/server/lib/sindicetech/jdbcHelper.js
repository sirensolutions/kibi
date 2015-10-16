var _       = require('lodash');
var os      = require('os');
var sync_request = require('sync-request');
var config  = require('../../config');
var logger  = require('../logger');

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

JdbcHelper.prototype.prepareJdbcConfig = function (conf) {

  var pathToSindicetechFolder = this.getAbsolutePathToSindicetechFolder();
  var libpath = '';
  var libs = [];

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
    url: conf.connection_string,
    user: conf.username,
    password: conf.password
  };
  return jdbcConfig;

};

JdbcHelper.prototype.prepareJdbcPaths = function () {
  var libpaths = [];
  var libs = [];

  console.log('Preparing libraries paths before loading java jdbc - might take up to 10 sec');
  var resp = sync_request('GET', config.kibana.elasticsearch_url + '/' + config.kibana.kibana_index + '/datasource/_search', {
    qs: {
      size: 100
    },
    timeout: 10000
  });

  var body;
  try {
    body = JSON.parse(resp.getBody('utf8'));
  } catch (e) {
    logger.error('Could not parse resp as json [' + body + ']');
  }

  if (resp.statusCode === 200) {
    if (body && body.hits && body.hits.hits) {
      for (var i = 0; i < body.hits.hits.length; i++) {
        var datasource = body.hits.hits[i];
        if (datasource._source.datasourceType === 'sql_jdbc' || datasource._source.datasourceType === 'sparql_jdbc') {
          // here create the clazz
          var params = {};
          try {
            params = JSON.parse(datasource._source.datasourceParams);
          } catch (e) {}
          var jdbcConfig = this.prepareJdbcConfig(params);
          libpaths.push(jdbcConfig.libpath);
          libs = libs.concat(jdbcConfig.libs);
        }
      }
    }
  } else {
    var msg =
      'Fetching datasources from ' + config.kibana.kibana_index +
      ' index failed with status [' + resp.statusCode + '].\n' +
      'This is fine if you just started kibi first time and ' + config.kibana.kibana_index +
      ' index does not yet exists.\n' +
      'If this warning persist after restart - check the logs.';
    console.log(msg);
    logger.error(msg + 'Body:\n', body);
  }

  var ret = {
    libpaths: libpaths,
    libs: libs
  };
  console.log('Following libraries will be loaded:');
  console.log(JSON.stringify(ret, null, ' '));
  return ret;
};

module.exports = new JdbcHelper();
