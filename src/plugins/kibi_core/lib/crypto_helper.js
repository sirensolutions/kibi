var kibiUtils = require('kibiutils');
var crypto = require('crypto');
var forge = require('node-forge');
var datasourcesSchema = require('./datasources_schema');

function CryptoHelper() {
  this.supportedAlgorithms = [
    'AES-GCM'
  ];
}

/**
 * Decodes a base64 string and returns a node-forge buffer.
 * @private
 */
CryptoHelper.prototype._decodeBase64 = function (base64) {
  return forge.util.createBuffer((new Buffer(base64, 'base64')).toString('binary'));
};


/**
 * Generates a random IV using node-forge.
 *
 * @returns {string} a random IV
 */
CryptoHelper.prototype.generateIV = function () {
  return forge.random.getBytesSync(12);
};

/**
 * Decodes and validates a base64 encoded key.
 *
 * @return the key as a node-forge buffer.
 * @throws {Error} if the key is invalid.
 */
CryptoHelper.prototype.decodeBase64Key = function (base64key) {
  var keyBuffer = this._decodeBase64(base64key);

  switch (keyBuffer.length()) {
    case 16:
    case 24:
    case 32:
      return keyBuffer;
  }

  throw new Error('Invalid key length.');
};

/**
 * @returns {boolean} - true if the algorithm is supported.
 */
CryptoHelper.prototype.supportsAlgorithm = function (algorithm) {
  return this.supportedAlgorithms.indexOf(algorithm) !== -1;
};

/**
 * Encrypts a plain text using the specified algorithm and key; currently the
 * only supported algorithm is AES-GCM, using the implementation provided by
 * the node-forge library.
 *
 * @param {string} algorithm
 * @param {string} key - base64 encoded encryption key, key size is expected to be
 *                       must be 128, 192 or 256 bits.
 * @param {string} plaintext - the plaintext. Plaintext is encoded to utf-8.
 *
 * @returns {string} - a representation of the encrypted text in the following format:
 *
 *          <algorithm>:<ciphertext>:<iv>:<auth_tag>
 *
 *          ciphertext, iv and auth_tag are base64 encoded; the IV length is
 *          set to 96 bits, the auth_tag length is set to 128 bits.
 *          Additional data is not set.
 */
CryptoHelper.prototype.encrypt = function (algorithm, key, plaintext) {
  if (!this.supportsAlgorithm(algorithm)) {
    throw new Error('Unsupported algorithm.');
  }

  var keyBuffer = this.decodeBase64Key(key);
  var iv = this.generateIV();
  var cipher = forge.cipher.createCipher(algorithm, keyBuffer);
  cipher.start({
    iv: iv,
    tagLength: 128
  });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'), 'utf8');
  cipher.finish();

  return [
    algorithm,
    forge.util.encode64(cipher.output.data),
    forge.util.encode64(iv),
    forge.util.encode64(cipher.mode.tag.data)
  ].join(':');
};


/**
 * Decrypts an encrypted value using the specified key.
 *
 * @param {string} key - base64 encoded encryption key, key size is expected to be
 *                       must be 128, 192 or 256 bits.
 * @param {string} encrypted - the encrypted value as returned by the encrypt method.
 *
 * @returns {string} - the plaintext
 */
CryptoHelper.prototype.decrypt = function (key, encrypted) {
  var algorithm;
  var keyBuffer;

  if (!encrypted) {
    return null;
  }

  var parts = encrypted.split(':');
  if (parts.length < 4) {
    throw new Error('Invalid encrypted message.');
  }

  algorithm = parts[0];
  if (!this.supportsAlgorithm(algorithm)) {
    throw new Error('Unsupported algorithm.');
  }

  keyBuffer = this.decodeBase64Key(key);
  encrypted = this._decodeBase64(parts[1]);

  var decipher = forge.cipher.createDecipher(algorithm, keyBuffer);
  decipher.start({
    iv: this._decodeBase64(parts[2]),
    tag: this._decodeBase64(parts[3])
  });
  decipher.update(encrypted);
  if (decipher.finish()) {
    return decipher.output.toString();
  } else {
    throw new Error('Value can\'t be decrypted.');
  }
};


/**
 * Encrypts datasource parameters marked as encrypted in the schema.
 */
CryptoHelper.prototype.encryptDatasourceParams = function (config, query) {
  if (query.datasourceParams && query.datasourceType) {

    var datasourceType = query.datasourceType;
    if (kibiUtils.isJDBC(datasourceType)) {
      datasourceType = 'jdbc';
    }


    var schema = datasourcesSchema[datasourceType];

    var params;
    try {
      params = JSON.parse(query.datasourceParams, null, ' ');
    } catch (e) {
      throw new Error('Could not parse datasourceParams: ' + query.datasourceParams + ' is not valid JSON.');
    }

    if (!schema) {
      throw new Error('Could not get schema for datasource type: ' + datasourceType + ' .');
    }

    var algorithm = config.get('kibi_core.datasource_encryption_algorithm');
    var password = config.get('kibi_core.datasource_encryption_key');


    for (var paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        for (var i = 0; i < schema.length; i++) {
          if (schema[i].name === paramName && schema[i].encrypted === true) {
            // encrypt it
            if (params[paramName].indexOf(algorithm) !== 0) {
              // encrypt only if it is not already encrypted
              params[paramName] = this.encrypt(algorithm, password, params[paramName]);
            }
            break;
          }
        }
      }
    }

    query.datasourceParams = JSON.stringify(params);
  }
};


module.exports = new CryptoHelper();



