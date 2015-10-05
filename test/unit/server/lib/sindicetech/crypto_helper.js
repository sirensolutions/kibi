var root = require('requirefrom')('');
var cryptoHelper = root('src/server/lib/sindicetech/crypto_helper');
var expect = require('expect.js');


describe('Crypto Helper', function () {
  describe('Encrypt', function () {

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
  });
});

