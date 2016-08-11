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
  this.logger = logger(server, 'kibi_core/index_helper');
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

/**
 * Re-encrypts the encrypted parameters in datasource objects and updates the
 * value of the following parameters in the configuration file:
 *
 * - kibi_core -> datasource_encryption_algorithm.
 * - kibi_core -> datasource_encryption_key.
 *
 * The original configuration file is renamed by appending the `.bak` extension.
 *
 * @param oldkey - The current encryption key.
 * @param algorithm - The cipher algorithm.
 * @param key - The new key.
 * @param path - The path to the configuration file.
 */
IndexHelper.prototype.rencryptAllValuesInKibiIndex = async function (oldkey, algorithm, key, path) {
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

  let datasourcesResponse = await self.getDatasources();
  var body = '';

  if (datasourcesResponse.length === 0) {
    return;
  }

  for (let datasource of datasourcesResponse) {
    this.logger.info(`Processing datasource "${datasource._id}".`);

    body += JSON.stringify({
      index: {
        _index: datasource._index,
        _type: datasource._type,
        _id: datasource._id}
    }) + '\n';

    // Get the properties which should be encrypted according to the schema
    var type = datasource._source.datasourceType;
    if (kibiUtils.isJDBC(type)) {
      type = 'jdbc';
    }
    var schema = datasourcesSchema[type].concat(datasourcesSchema.base);
    var params = {};
    params = JSON.parse(datasource._source.datasourceParams);

    for (var name in params) {
      if (params.hasOwnProperty(name)) {
        var s = this._getDefinitionFromSchema(schema, name);
        if (s.encrypted === true) {
          this.logger.info(`Found encrypted parameter "${name}".`);

          // first check that the value match the encrypted pattern
          var parts = params[name].split(':');
          if (parts.length >= 4) {
            if (cryptoHelper.supportsAlgorithm(parts[0])) {
              var plaintext = cryptoHelper.decrypt(oldkey, params[name]);
              this.logger.info('Decrypted value.');
              params[name] = cryptoHelper.encrypt(algorithm, key, plaintext);
              this.logger.info('Encrypted value.');
            } else {
              return Promise.reject(new Error(`Can't decrypt value of parameter "${params[name]}" in datasource "${datasource._id}":` +
                ` unsupported cipher "${parts[0]}"`));
            }
          } else {
            this.logger.info(`Value ${params[name]} was not previously encrypted.`);
            params[name] = cryptoHelper.encrypt(algorithm, key, params[name]);
            this.logger.info('Encrypted value.');
          }
        }
      }
    }

    datasource._source.datasourceParams = JSON.stringify(params);
    body += JSON.stringify(datasource._source) + '\n';
    this.logger.info(`Processed datasource "${datasource._id}".`);
  }

  this.logger.info('Bulk updating datasources.');
  await this.setDatasources(body);
  this.logger.info('Bulk updated datasources successfully.');

  this.logger.info(`Updating file "${path}"`);
  await this.swapKibiYml(path, algorithm, key);
  self.logger.info(`Updated file "${path}"; a backup of the previous version has been saved to "${path}.bak ."`);
};

IndexHelper.prototype.swapKibiYml = function (path, algorithm, key) {
  var self = this;
  return new Promise(function (fulfill, reject) {

    fs.readFile(path, 'utf8', function (err, data) {
      if (err) {
        return reject(err);
      }

      var c = data
      .replace(/datasource_encryption_algorithm:.+?\n/g, 'datasource_encryption_algorithm: \'' + algorithm + '\'\n')
      .replace(/datasource_encryption_key:.+?\n/g, 'datasource_encryption_key: \'' + key + '\'\n');

      fs.rename(path, path + '.bak', function (err) {
        if (err) {
          self.logger.error(`Could not save a backup of file "${path}"; error details:\n${err}`);
          return reject(new Error(`Could not rename file "${path}", please replace its contents ` +
            `with the following:\n\n${c}`));
        }

        fs.writeFile(path, c, function (err) {
          if (err) {
            self.logger.error(`Could not write file "${path}"; error details:\n${err}`);
            return reject(new Error(`Could not write file "${path}", please check the permissions of the directory and write ` +
                                    `the following configuration to the file:\n\n${c}`));
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
