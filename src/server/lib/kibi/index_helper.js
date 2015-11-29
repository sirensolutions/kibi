var Promise      = require('bluebird');
var _            = require('lodash');
var fs           = require('fs');
var rp           = require('request-promise');
var url          = require('url');
var yaml = require('js-yaml');
var cryptoHelper = require('../sindicetech/crypto_helper');
var config       = require('../../config');

function IndexHelper() {}


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
  return new Promise(function (fulfill, reject) {
    // get all datasources
    self.getDatasources().then(function (res1) {

      report.push('Got ' + res1.length + ' datasources.');
      // now assemble the bulk api request body
      var body = '';
      _.each(res1, function (datasource) {
        body += JSON.stringify({index: {_index: datasource._index, _type: datasource._type, _id: datasource._id} }) + '\n';

        // here get the properties which should be encrypted according to the shema
        var type = datasource._source.datasourceType;
        if (type === 'sql_jdbc' || type === 'sparql_jdbc' ) {
          type = 'jdbc';
        }
        var schema = config.kibana.datasources_schema[type].concat(config.kibana.datasources_schema.base);
        var params = {};
        try {
          params = JSON.parse(datasource._source.datasourceParams);
        } catch (e) {
          reject(e);
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
          reject(e);
        }
        body += JSON.stringify(datasource._source) + '\n';
      });

      self.setDatasources(body).then(function (res2) {
        report.push('Saving new kibi.yml');
        self.swapKibiYml(path, algorithm, key).then(function () {
          report.push('New kibi.yml saved. Old kibi.yml moved to kibi.yml.bak');
          report.push('DONE');
          fulfill(report);
        });

      })
      .catch(reject);
    })
    .catch(reject);
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
        if ( err ) {
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
  return rp({
    method: 'POST',
    uri: url.parse(config.kibana.elasticsearch_url + '/' + config.kibana.kibana_index + '/_bulk'),
    body: body
  });
};

IndexHelper.prototype.getDatasources = function () {
  return rp({
    method: 'GET',
    uri: url.parse(config.kibana.elasticsearch_url + '/' + config.kibana.kibana_index + '/datasource/_search?size=100'),
    transform: function (resp) {
      var data = JSON.parse(resp);
      if (data.hits && data.hits.hits) {
        return data.hits.hits;
      } else {
        throw new Error('Could not get datasources');
      }
    }
  });
};

module.exports = new IndexHelper();
