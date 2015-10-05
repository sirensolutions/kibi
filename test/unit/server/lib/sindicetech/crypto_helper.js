var root = require('requirefrom')('');
var cryptoHelper = root('src/server/lib/sindicetech/crypto_helper');
var expect = require('expect.js');


describe('Crypto Helper', function () {
  describe('Encrypt', function () {


    it('aes-256-gcm', function () {
      var plainText = 'hallo';
      var password = '3zTvzr3p67VC61jmV54rIYu1545x4TlY';
      var algo = 'aes-256-gcm';

      try {
        cryptoHelper.encrypt(algo, password, plainText);
      } catch (e) {
        expect(e.message).to.equal('Not supported in node 0.10.x');
      }

    });

    var algos = ['aes-128-cbc', 'aes-256-ctr'];

    it('different algos', function () {
      var plainText = 'hallo';
      var password = '123456';


      for (var i = 0; i < algos.length; i++) {
        var algo = algos[i];
        var encrypted = cryptoHelper.encrypt(algo, password, plainText);
        var decrypted = cryptoHelper.decrypt(password, encrypted);
        expect(decrypted).to.equal(plainText);
      }

    });
  });
});

