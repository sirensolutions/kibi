var root = require('requirefrom')('');
var cryptoHelper = root('src/server/lib/sindicetech/crypto_helper');
var expect = require('expect.js');
var sinon = require('sinon');
var forge = require('node-forge');


describe('Crypto Helper', function () {
  var default_key = 'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=';

  var default_config = {
    kibana: {
      datasource_encryption_algorithm: 'AES-GCM',
      datasource_encryption_key: default_key,
      datasources_schema: {
        type1: [
          {
            name: 'password',
            encrypted: true
          }
        ]
      }
    }
  };

  var decryptTest = cryptoHelper.decrypt.bind(cryptoHelper);
  var encryptTest = cryptoHelper.encrypt.bind(cryptoHelper);
  var encryptDatasourceparamsTest = cryptoHelper.encryptDatasourceParams.bind(cryptoHelper);

  describe('.encrypt', function () {

    describe('getting a known IV', function () {
      beforeEach(function () {
        sinon.stub(forge.random, 'getBytesSync').returns(forge.util.hexToBytes('0a0305555550000300a00000'));
      });

      it('should encrypt plain text correctly', function () {
        var plainText = 'BONTEMPIàÀ的123';
        var encrypted = cryptoHelper.encrypt('AES-GCM', default_key, plainText);

        expect(encrypted).to.eql('AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==');

        expect(cryptoHelper.decrypt(default_key, encrypted)).to.eql(plainText);
      });

      it('should throw an error if the value cannot be decrypted', function () {
        var encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';

        expect(decryptTest)
          .withArgs(default_key, encrypted)
          .to.not.throwError('Value can\'t be decrypted.');

        //invalid tag
        encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:faPn/SPOXfqYMWNysdOkVw==';

        expect(decryptTest)
          .withArgs(default_key, encrypted)
          .to.throwError('Value can\'t be decrypted.');

        //invalid iv
        encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:AgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';
        expect(decryptTest)
          .withArgs('JhWzsL2ZrgiaPjv+sHtMIPSDxu3yfPvNqMSQoEectxo=', encrypted)
          .to.throwError('Value can\'t be decrypted.');

        // invalid key
        encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';
        expect(decryptTest)
          .withArgs('JhWzsL2ZrgiaPjv+sHtMIPSDxu3yfPvNqMSQoEectxo=', encrypted)
          .to.throwError('Value can\'t be decrypted.');
      });

      afterEach(function () {
        forge.random.getBytesSync.restore();
      });
    });

    describe('getting a random IV', function () {
      it('should encrypt plain text correctly using the default key', function () {
        var plainText = 'BONTEMPIàÀ的123 12389889HHSD$$$';
        var encrypted = cryptoHelper.encrypt('AES-GCM', default_key, plainText);
        expect(cryptoHelper.decrypt(default_key, encrypted)).to.eql(plainText);
      });

      it('should encrypt plain text correctly using random keys', function () {
        var plainText = 'BONTEMPIàÀ的123 23k12jJASDjhj';
        var encrypted;

        var keys = [
          forge.util.encode64(forge.random.getBytesSync(16)),
          forge.util.encode64(forge.random.getBytesSync(24)),
          forge.util.encode64(forge.random.getBytesSync(32))
        ];

        for (var k = keys.length; k--;) {
          encrypted = cryptoHelper.encrypt('AES-GCM', keys[k], plainText);
          expect(cryptoHelper.decrypt(keys[k], encrypted)).to.eql(plainText);
        }
      });
    });

    it('should throw an error if the algorithm is not supported', function () {
      expect(encryptTest)
        .withArgs('', 'key', 'plain')
        .to.throwError('Unsupported algorithm.');
      expect(encryptTest)
        .withArgs('AES-CTR', 'key', 'plain')
        .to.throwError('Unsupported algorithm.');
    });

    it('should throw an error if the key length is invalid', function () {
      expect(encryptTest)
        .withArgs('AES-GCM', 'SU5WQUxJRCBLRVk=', 'plain')
        .to.throwError('Invalid key length.');
    });

    it('should return null when requested to encrypt empty values', function () {
      var encrypted = cryptoHelper.encrypt('AES-GCM', default_key, '');
      expect(encrypted).to.be.null;

      encrypted = cryptoHelper.encrypt('AES-GCM', default_key, null);
      expect(encrypted).to.be.null;

      encrypted = cryptoHelper.encrypt('AES-GCM', default_key);
      expect(encrypted).to.be.null;
    });

  });

  describe('.decrypt', function () {

    it('should return null when requested to decrypt empty values', function () {
      expect(cryptoHelper.decrypt(default_key, undefined)).to.be.null;
      expect(cryptoHelper.decrypt(default_key, null)).to.be.null;
      expect(cryptoHelper.decrypt(default_key, '')).to.be.null;
    });

    it('should throw an error if the encrypted message an incorrect number of parts', function () {
      expect(decryptTest).withArgs(default_key, 'a')
        .to.throwError('Invalid encrypted message.');
      expect(decryptTest).withArgs(default_key, 'a:b')
        .to.throwError('Invalid encrypted message.');
      expect(decryptTest).withArgs(default_key, 'a:b:c')
        .to.throwError('Invalid encrypted message.');
    });

    it('should throw an error if the algorithm is not supported', function () {
      var encrypted = 'AES-CTR:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';
      expect(decryptTest)
        .withArgs(default_key, encrypted)
        .to.throwError('Unsupported algorithm.');
    });

    it('should throw an error if the key size is invalid', function () {
      expect(decryptTest)
        .withArgs('SU5WQUxJRCBLRVk=:SU5WQUxJRCBLRVk=:SU5WQUxJRCBLRVk=:SU5WQUxJRCBLRVk=', 'plain')
        .to.throwError('Invalid key length.');
    });

  });

  describe('.encryptDatasourceParams', function () {

    it ('should throw an error when passed an invalid json.', function () {
      var query = {
        datasourceType: 'type1',
        datasourceParams: '{invalid json}'
      };

      expect(encryptDatasourceparamsTest)
        .withArgs(default_config, query)
        .to.throwError('Could not parse datasourceParams: [{invalid json}] in the query ');
    });

    it ('should throw an error if datasource type has no associated schema.', function () {
      var query = {
        datasourceType: 'type1',
        datasourceParams: JSON.stringify({
          password: 'xxx'
        })
      };

      var config = {
        kibana: {
          datasource_encryption_algorithm: default_config.kibana.datasource_encryption_algorithm,
          datasource_encryption_key: default_config.kibana.datasource_encryption_key,
          datasources_schema: {}
        }
      };

      expect(encryptDatasourceparamsTest)
        .withArgs(config, query)
        .to.throwError('Could not get schema for datasource type: type1 .');
    });

    describe('getting a known IV', function () {
      beforeEach(function () {
        sinon.stub(forge.random, 'getBytesSync').returns(forge.util.hexToBytes('0a0305555550000300a00000'));
      });

      it('should encrypt datasource parameters correctly', function () {
        var query = {
          datasourceType: 'type1',
          datasourceParams: JSON.stringify({
            password: 'BONTEMPIàÀ的123'
          })
        };

        var expected =  {
          datasourceType: 'type1',
          datasourceParams: JSON.stringify(
            {
              password: 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw=='
            }
          )
        };

        cryptoHelper.encryptDatasourceParams(default_config, query);
        expect(query).to.eql(expected);
      });

      afterEach(function () {
        forge.random.getBytesSync.restore();
      });
    });

    describe('getting a random IV', function () {
      it('should encrypt datasource parameters correctly using the default key', function () {
        var password = 'BONTEMPIàÀ的123';

        var query = {
          datasourceType: 'type1',
          datasourceParams: JSON.stringify({
            password: password
          })
        };

        cryptoHelper.encryptDatasourceParams(default_config, query);

        expect(query.datasourceType).to.eql(query.datasourceType);
        var params = JSON.parse(query.datasourceParams);
        expect(cryptoHelper.decrypt(default_key, params.password)).to.eql(password);
      });
    });
  });

});

