var root = require('requirefrom')('');
var cryptoHelper = root('src/server/lib/sindicetech/crypto_helper');
var expect = require('expect.js');


describe('Crypto Helper', function () {
  describe('Encrypt', function () {

    var config = {
      kibana: {
        datasource_encryption_algorithm: 'aes-256-ctr',
        datasource_encryption_key: '3zTvzr3p67VC61jmV54rIYu1545x4TlZ',
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

    var plainText = 'hallo';
    var password = '3zTvzr3p67VC61jmV54rIYu1545x4TlY';

    // authenticated encryption modes which are currently not supported due to nodejs version
    var algosNOK = [
      'aes-256-cbc-hmac-sha1',
      'aes-256-xts',
      'aes-256-gcm'
    ];

    var algosOK = [
      'aes-256-ctr',
      'aes-256-cbc',
      'aes-256-cfb',
      'aes-256-cfb1',
      'aes-256-cfb8',
      'aes-256-ctr',
      'aes-256-ecb',
      'aes-256-ofb',
      'aes256',
      'camellia-256-cbc',
      'camellia-256-cfb',
      'camellia-256-cfb1',
      'camellia-256-cfb8',
      'camellia-256-ecb',
      'camellia-256-ofb',
      'camellia256',
    ];

    it('authenticated encryption modes', function () {
      for (var i = 0; i < algosNOK.length; i++) {
        var algo = algosNOK[i];
        try {
          var encrypted = cryptoHelper.encrypt(algo, password, plainText);
          expect().fail('Should fail for' + algo + ' but produced: ' + encrypted);
        } catch (e) {
          expect(e.message).to.equal('Not supported in node 0.10.x');
        }
      }
    });

    it('different algos', function () {
      for (var i = 0; i < algosOK.length; i++) {
        var algo = algosOK[i];
        var encrypted = cryptoHelper.encrypt(algo, password, plainText);
        var decrypted = cryptoHelper.decrypt(password, encrypted);
        expect(decrypted).to.equal(plainText);
      }

    });

    it('decrypt with undefined value should return undefined', function () {
      expect(cryptoHelper.decrypt(password, undefined)).to.equal(undefined);
    });

    it('decrypt value with too many partsshould throw an error', function () {
      try {
        cryptoHelper.decrypt(password, 'algo:iv:encrypted:extra');
      } catch (e) {
        expect(e.message).to.equal('Invalid encrypted message.');
      }
    });

    it('decrypt value with 3 parts not supported yet should throw an error', function () {
      try {
        cryptoHelper.decrypt(password, 'algo:iv:encrypted');
      } catch (e) {
        expect(e.message).to.equal('Ciphers with iv parts not fully supported in node 0.10.x');
      }
    });

    it('decrypt value with too few parts should throw an error', function () {
      try {
        cryptoHelper.decrypt(password, 'only-algo');
      } catch (e) {
        expect(e.message).to.equal('Invalid encrypted message.');
      }
    });


    it ('encryptDatasourceParams malformed datasourceParams in the query', function () {
      var query = {
        datasourceType: 'type1',
        datasourceParams: '{invalid json}'
      };

      try {
        cryptoHelper.encryptDatasourceParams(config, query);
      } catch (e) {
        expect(e.message).to.eql('Could not parse datasourceParams: [{invalid json}] in the query ');
      }
    });

    it ('encryptDatasourceParams missing schema', function () {
      var query = {
        datasourceType: 'type1',
        datasourceParams: JSON.stringify(
          {
            password: 'xxx'
          }
        )
      };

      var config1 = {
        kibana: {
          datasource_encryption_algorithm: 'aes-256-ctr',
          datasource_encryption_key: '3zTvzr3p67VC61jmV54rIYu1545x4TlZ',
          datasources_schema: {}
        }
      };

      try {
        cryptoHelper.encryptDatasourceParams(config1, query);
      } catch (e) {
        expect(e.message).to.eql('Could not get schema for datasource type: [type1]');
      }
    });

    it ('encryptDatasourceParams', function () {

      var query = {
        datasourceType: 'type1',
        datasourceParams: JSON.stringify(
          {
            password: 'xxx'
          }
        )
      };

      var expected =  {
        datasourceType: 'type1',
        datasourceParams: JSON.stringify(
          {
            password: 'aes-256-ctr:50ecc5'
          }
        )
      };

      cryptoHelper.encryptDatasourceParams(config, query);

      expect(query).to.eql(expected);
    });




  });
});

