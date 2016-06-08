var kibiUtils = require('kibiutils');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var yaml = require('js-yaml');
var cryptoHelper = require('./crypto_helper');
var datasourcesSchema = require('./datasources_schema');
var logger = require('./logger');

function IndexHelper(server) {
  this.server = server;
  this.config = server.config();
  this.log = logger(server, 'index_helper');
  this.client = server.plugins.elasticsearch.client;
}


IndexHelper.prototype._getDefinitionFromSchema = function (schema, name) {
  for (var i = 0; i < schema.length; i++) {
    if (schema[i].name === name) {
      return schema[i];
    }
  }
  return null;
};

IndexHelper.prototype.rencryptAllValuesInKibiIndex = function (oldkey, algorithm, key, path) {
  if (!oldkey) {
    return Promise.reject(new Error('oldkey not defined'));
  }
  if (!algorithm) {
    return Promise.reject(new Error('algorithm not defined'));
  }
  if (!key) {
    return Promise.reject(new Error('key not defined'));
  }
  if (!path) {
    return Promise.reject(new Error('path not defined'));
  }
  if (!cryptoHelper.supportsAlgorithm(algorithm)) {
    return Promise.reject(new Error('Unsupported algorithm. Use one of: ' + cryptoHelper.supportedAlgorithms));
  }

  var self = this;
  var report = [];
    // get all datasources
  return self.getDatasources().then(function (res1) {

    report.push('Got ' + res1.length + ' datasources.');
    // now assemble the bulk api request body
    var body = '';
    var error = null;
    _.each(res1, function (datasource) {
      body += JSON.stringify({index: {_index: datasource._index, _type: datasource._type, _id: datasource._id} }) + '\n';

      // here get the properties which should be encrypted according to the shema
      var type = datasource._source.datasourceType;
      if (kibiUtils.isJDBC(type)) {
        type = 'jdbc';
      }
      var schema = datasourcesSchema[type].concat(datasourcesSchema.base);
      var params = {};
      try {
        params = JSON.parse(datasource._source.datasourceParams);
      } catch (e) {
        error = e;
        return false;
      }

      for (var name in params) {
        if (params.hasOwnProperty(name)) {
          var s = self._getDefinitionFromSchema(schema, name);
          if (s.encrypted === true) {
            report.push('param: ' + name + ' value: ' + params[name]);
            // first check that the value match the encrypted pattern
            var parts = params[name].split(':');
            if (parts.length >= 4) {
              if (cryptoHelper.supportsAlgorithm(parts[0])) {
                var plaintext = cryptoHelper.decrypt(oldkey, params[name]);
                report.push('decrypted value');
                params[name] = cryptoHelper.encrypt(algorithm, key, plaintext);
                report.push('encrypted the value');
              } else {
                report.push('unsupported algorithm [' + parts[0] + '] for [' + name + ' ' + params[name] + ']');
              }
            } else {
              report.push('Param value [' + params[name] + '] should be encrypted but it seems NOT');
              params[name] = cryptoHelper.encrypt(algorithm, key, params[name]);
              report.push('encrypted the value');
            }
          }
        }
      }

      try {
        datasource._source.datasourceParams = JSON.stringify(params);
      } catch (e) {
        error = e;
        return false;
      }
      body += JSON.stringify(datasource._source) + '\n';
    });
    if (error) {
      return Promise.reject(error);
    }

    return self.setDatasources(body).then(function (res2) {
      report.push('Saving new kibi.yml');
      return self.swapKibiYml(path, algorithm, key).then(function () {
        report.push('New kibi.yml saved. Old kibi.yml moved to kibi.yml.bak');
        report.push('DONE');
        return report;
      });
    });
  });
};

IndexHelper.prototype.swapKibiYml = function (path, algorithm, key) {
  return new Promise(function (fulfill, reject) {

    fs.readFile(path, 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }

      var c = data
      .replace(/datasource_encryption_algorithm:.+?\n/g, 'datasource_encryption_algorithm: \'' + algorithm + '\'\n')
      .replace(/datasource_encryption_key:.+?\n/g, 'datasource_encryption_key: \'' + key + '\'\n');

      fs.rename(path, path + '.bak', function (err) {
        if (err) {
          console.log('Could not rename kibi.yml to kibi.yml.bak');
          reject(err);
        }

        fs.writeFile(path, c, function (err) {
          if (err) {
            console.log('Could not save new kibi.yml');
            console.log('===== NEW CONFIG =====');
            console.log(c);
            console.log('======================');
            reject(err);
          }

          fulfill(true);
        });
      });
    });
  });
};

IndexHelper.prototype.setDatasources = function (body) {
  var self = this;
  return self.client.bulk({
    body: body
  });
};

IndexHelper.prototype.getDatasources = function () {
  var self = this;
  return self.client.search({
    index: self.config.get('kibana.index'),
    type: 'datasource',
    size: 100
  }).then((results) => {
    if (!results.hits || !results.hits.total) {
      return Promise.reject(new Error('Could not get datasources'));
    }
    return results.hits.hits;
  });
};

module.exports = IndexHelper;
