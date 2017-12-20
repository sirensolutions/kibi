import expect from 'expect.js';
import sinon from 'sinon';
import forge from 'node-forge';
import datasourcesSchema from '../datasources_schema';
import cryptoHelper from '../crypto_helper';

describe('Crypto Helper', function () {
  const defaultKey = 'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=';
  const defaultConfig = {
    get(key) {
      if (key === 'kibi_core.datasource_encryption_algorithm') {
        return 'AES-GCM';
      } else if (key === 'kibi_core.datasource_encryption_key') {
        return defaultKey;
      } else  {
        throw new Error('Unsupported config key: ' + key);
      }
    }
  };

  afterEach(() => {
    if (datasourcesSchema.getSchema.restore) {
      datasourcesSchema.getSchema.restore();
    }
  });

  describe('fake schema', function () {
    beforeEach(function () {
      sinon.stub(datasourcesSchema, 'getSchema').returns([
        {
          name: 'password',
          encrypted: true
        }
      ]);
    });

    describe('.encrypt', function () {

      describe('getting a known IV', function () {

        it('should encrypt plain text correctly', function () {
          sinon.stub(cryptoHelper, 'generateIV').returns(forge.util.hexToBytes('0a0305555550000300a00000'));

          const plainText = 'BONTEMPIàÀ的123';
          const encrypted = cryptoHelper.encrypt('AES-GCM', defaultKey, plainText);

          expect(encrypted).to.eql('AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==');
          expect(cryptoHelper.decrypt(defaultKey, encrypted)).to.eql(plainText);

          cryptoHelper.generateIV.restore();
        });

        it('should throw an error if the value cannot be decrypted', function () {
          sinon.stub(cryptoHelper, 'generateIV').returns(forge.util.hexToBytes('0a0305555550000300a00000'));

          let encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';

          expect(function () {
            cryptoHelper.decrypt(defaultKey, encrypted);
          }).to.not.throwError('Value can\'t be decrypted.');

          //invalid tag
          encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:faPn/SPOXfqYMWNysdOkVw==';

          expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs(defaultKey, encrypted)
            .to.throwError(/Value can't be decrypted./);

          //invalid iv
          encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:AgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';
          expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs('JhWzsL2ZrgiaPjv+sHtMIPSDxu3yfPvNqMSQoEectxo=', encrypted)
            .to.throwError(/Value can't be decrypted./);

          // invalid key
          encrypted = 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';
          expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs('JhWzsL2ZrgiaPjv+sHtMIPSDxu3yfPvNqMSQoEectxo=', encrypted)
            .to.throwError(/Value can't be decrypted./);

          cryptoHelper.generateIV.restore();
        });

      });

      describe('getting a random IV', function () {

        it('should encrypt plain text correctly using the default key', function () {
          const plainText = 'BONTEMPIàÀ的123 12389889HHSD$$$';
          const encrypted = cryptoHelper.encrypt('AES-GCM', defaultKey, plainText);
          expect(cryptoHelper.decrypt(defaultKey, encrypted)).to.eql(plainText);
        });

        it('should encrypt plain text correctly using random keys', function () {
          const plainText = 'BONTEMPIàÀ的123 23k12jJASDjhj';
          let encrypted;

          const keys = [
            forge.util.encode64(forge.random.getBytesSync(16)),
            forge.util.encode64(forge.random.getBytesSync(24)),
            forge.util.encode64(forge.random.getBytesSync(32))
          ];

          for (let k = keys.length; k--;) {
            encrypted = cryptoHelper.encrypt('AES-GCM', keys[k], plainText);
            expect(cryptoHelper.decrypt(keys[k], encrypted)).to.eql(plainText);
          }
        });
      });

      it('should throw an error if the algorithm is not supported', function () {
        expect(cryptoHelper.encrypt.bind(cryptoHelper)).withArgs('', 'key', 'plain')
          .to.throwError(/Unsupported algorithm./);

        expect(cryptoHelper.encrypt.bind(cryptoHelper)).withArgs('AES-CTR', 'key', 'plain')
          .to.throwError(/Unsupported algorithm./);
      });

      it('should throw an error if the key length is invalid', function () {
        expect(cryptoHelper.encrypt.bind(cryptoHelper)).withArgs('AES-GCM', 'SU5WQUxJRCBLRVk=', 'plain')
          .to.throwError(/Invalid key length/);
      });

      it('should return null when requested to encrypt empty values', function () {
        let encrypted = cryptoHelper.encrypt('AES-GCM', defaultKey, '');
        expect(encrypted).to.be.null;

        encrypted = cryptoHelper.encrypt('AES-GCM', defaultKey, null);
        expect(encrypted).to.be.null;

        encrypted = cryptoHelper.encrypt('AES-GCM', defaultKey);
        expect(encrypted).to.be.null;
      });

    });

    describe('.decrypt', function () {

      it('should return null when requested to decrypt empty values', function () {
        expect(cryptoHelper.decrypt).withArgs(defaultKey, undefined).to.be.null;
        expect(cryptoHelper.decrypt).withArgs(defaultKey, null).to.be.null;
        expect(cryptoHelper.decrypt).withArgs(defaultKey, '').to.be.null;
      });

      it('should throw an error if the encrypted message an incorrect number of parts', function () {
        expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs(defaultKey, 'a')
          .to.throwError(/Invalid encrypted message./);
        expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs(defaultKey, 'a:b')
          .to.throwError(/Invalid encrypted message./);
        expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs(defaultKey, 'a:b:c')
          .to.throwError(/Invalid encrypted message./);
      });

      it('should throw an error if the algorithm is not supported', function () {
        const encrypted = 'AES-CTR:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==';
        expect(cryptoHelper.decrypt.bind(cryptoHelper)).withArgs(defaultKey, encrypted)
          .to.throwError(/Unsupported algorithm./);
      });

      it('should throw an error if the key size is invalid', function () {
        expect(cryptoHelper.decrypt.bind(cryptoHelper))
        .withArgs('invalid key', 'AES-GCM:SU5WQUxJRCBLRVk=:SU5WQUxJRCBLRVk=:SU5WQUxJRCBLRVk=')
        .to.throwError(/Invalid key length/);
      });

    });


    describe('.encryptDatasourceParams', function () {

      it ('should throw an error when passed an invalid json.', function () {
        const query = {
          datasourceType: 'type1',
          datasourceParams: '{invalid json}'
        };

        expect(cryptoHelper.encryptDatasourceParams.bind(cryptoHelper)).withArgs(defaultConfig, query)
          .to.throwError(/Could not parse datasourceParams: {invalid json} is not valid JSON/);
      });

      describe('getting a known IV', function () {

        it('should encrypt datasource parameters correctly', function () {

          sinon.stub(cryptoHelper, 'generateIV').returns(forge.util.hexToBytes('0a0305555550000300a00000'));

          const query = {
            datasourceType: 'type1',
            datasourceParams: JSON.stringify({
              password: 'BONTEMPIàÀ的123'
            })
          };

          const expected =  {
            datasourceType: 'type1',
            datasourceParams: JSON.stringify(
              {
                password: 'AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw=='
              }
            )
          };

          cryptoHelper.encryptDatasourceParams(defaultConfig, query);
          expect(query).to.eql(expected);

          cryptoHelper.generateIV.restore();
        });

      });


      describe('getting a random IV', function () {
        it('should encrypt datasource parameters correctly using the default key', function () {
          const password = 'BONTEMPIàÀ的123';

          const query = {
            datasourceType: 'type1',
            datasourceParams: JSON.stringify({
              password: password
            })
          };

          cryptoHelper.encryptDatasourceParams(defaultConfig, query);

          expect(query.datasourceType).to.eql(query.datasourceType);
          const params = JSON.parse(query.datasourceParams);
          expect(cryptoHelper.decrypt(defaultKey, params.password)).to.eql(password);
        });
      });

    });

  });


  describe('empty schema', function () {

    beforeEach(function () {
      sinon.stub(datasourcesSchema, 'getSchema').throws(new Error('Could not get schema for datasource type: type2.'));
    });

    describe('.encryptDatasourceParams', function () {
      it ('should throw an error if datasource type has no associated schema.', function () {
        const query = {
          datasourceType: 'type2',
          datasourceParams: JSON.stringify({
            password: 'xxx'
          })
        };

        expect(cryptoHelper.encryptDatasourceParams).withArgs(defaultConfig, query)
          .to.throwError(/Could not get schema for datasource type: type2./);
      });
    });
  });
});
