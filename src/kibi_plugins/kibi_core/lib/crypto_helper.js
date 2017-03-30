import kibiUtils from 'kibiutils';
import crypto from 'crypto';
import forge from 'node-forge';
import datasourcesSchema from './datasources_schema';

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
  const keyBuffer = this._decodeBase64(base64key);

  switch (keyBuffer.length()) {
    case 16:
    case 24:
    case 32:
      return keyBuffer;
  }

  throw new Error('Invalid key length - check the encryption key in kibi.yml');
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

  const keyBuffer = this.decodeBase64Key(key);
  const iv = this.generateIV();
  const cipher = forge.cipher.createCipher(algorithm, keyBuffer);
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
  if (!encrypted) {
    return null;
  }

  const parts = encrypted.split(':');
  if (parts.length < 4) {
    throw new Error('Invalid encrypted message.');
  }

  const algorithm = parts[0];
  if (!this.supportsAlgorithm(algorithm)) {
    throw new Error('Unsupported algorithm.');
  }

  const keyBuffer = this.decodeBase64Key(key);
  encrypted = this._decodeBase64(parts[1]);

  const decipher = forge.cipher.createDecipher(algorithm, keyBuffer);
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
  if (!query.datasourceParams || !query.datasourceType) {
    return;
  }

  let datasourceType = query.datasourceType;
  if (kibiUtils.isJDBC(datasourceType)) {
    datasourceType = 'jdbc';
  }

  const schema = datasourcesSchema.getSchema(datasourceType);

  let params;
  try {
    params = JSON.parse(query.datasourceParams, null, ' ');
  } catch (e) {
    throw new Error('Could not parse datasourceParams: ' + query.datasourceParams + ' is not valid JSON.');
  }

  const algorithm = config.get('kibi_core.datasource_encryption_algorithm');
  const password = config.get('kibi_core.datasource_encryption_key');

  for (const paramName in params) {
    if (params.hasOwnProperty(paramName)) {
      for (let i = 0; i < schema.length; i++) {
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
};


module.exports = new CryptoHelper();
