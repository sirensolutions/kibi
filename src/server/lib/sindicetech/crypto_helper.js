var crypto = require('crypto');


function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


function CryptoHelper() {
}


CryptoHelper.prototype.encrypt = function (algorithm, password, plaintext) {
  var cipher;
  var encrypted;
  var finalBuffer;

  if (endsWith(algorithm, '-gcm')) {
    throw new Error ('Not supported in node 0.10.x');
    /*
    Enable when we switch to node 0.11

    var iv = new crypto.randomBytes(32);
    var key = new Buffer(password);
    cipher = crypto.createCipheriv(algorithm, key, iv);
    encrypted = cipher.update(plaintext, 'utf8');
    finalBuffer = Buffer.concat([encrypted, cipher.final()]);
    var tag = cipher.getAuthTag();
    return algorithm + ':' + tag + ':' + finalBuffer.toString('hex');
    */
  } else {
    cipher = crypto.createCipher(algorithm, password);
    encrypted = cipher.update(plaintext, 'utf8');
    finalBuffer = Buffer.concat([encrypted, cipher.final()]);
    return algorithm + ':' + finalBuffer.toString('hex');
  }
};

CryptoHelper.prototype.decrypt = function (password, encrypted) {
  var parts = encrypted.split(':');
  if (!(parts.length === 2 || parts.length === 3)) {
    throw new Error('Invalid encrypted message.');
  }


  var algorithm;
  var tag;
  var decipher;
  var decrypted;
  var finalBuffer;

  if (parts.length === 3) {
    throw new Error ('Not supported in node 0.10.x');
    /*
    Enable when we switch to node 0.11
    algorithm = parts[0];
    tag = parts[1];
    encrypted = parts[2];
    var key = new Buffer(password);
    decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(tag);
    decrypted = decipher.update(encrypted, 'hex');
    finalBuffer = Buffer.concat([decrypted, decipher.final()]);
    return finalBuffer.toString('hex');
    */
  } else {
    algorithm = parts[0];
    encrypted = parts[1];
    decipher = crypto.createDecipher(algorithm, password);
    decrypted = decipher.update(encrypted, 'hex');
    finalBuffer = Buffer.concat([decrypted, decipher.final()]);
    return finalBuffer.toString('utf8');
  }
};


CryptoHelper.prototype.encryptDatasourceParams = function (config, query) {
  if (query.datasourceParams && query.datasourceType) {
    var datasourceType = query.datasourceType;
    var schema;
    var params;
    try {
      params = JSON.parse(query.datasourceParams, null, ' ');
    } catch (e) {
      throw new Error('Could not parse datasource params in the query');
    }
    try {
      schema = config.kibana.datasources_schema[datasourceType];
    } catch (e) {
      throw new Error('Could not get schema for datasource type: [' + datasourceType + ']');
    }


    // now iterate over params and check if any of them has to be encrypted
    var algorithm = config.kibana.datasource_encryption_algorithm;
    var password = config.kibana.datasource_encryption_password;

    for (var paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        for (var i = 0; i < schema.length; i++ ) {
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



