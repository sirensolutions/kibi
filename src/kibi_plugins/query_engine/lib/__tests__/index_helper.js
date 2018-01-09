/*global __dirname */
import expect from 'expect.js';
import Promise from 'bluebird';
import fs from 'fs';
import sinon from 'sinon';
import mockery from 'mockery';
import IndexHelper from '../index_helper';

const kibiIndex = '.siren';
const fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
        if (key === 'kibana.index') {
          return kibiIndex;
        } else {
          return '';
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      getCluster() {
        return {
          callWithInternalUser(method, params) {
            switch (method) {
              case 'bulk':
                return Promise.resolve({});
              case 'search':
                return Promise.resolve({
                  hits: {
                    total: 1,
                    hits: [
                      {
                        _index: '.siren',
                        _type: 'datasource',
                        _id: 'mysql-test',
                        _score: 1,
                        _source: {
                          title: 'mysql test datasource',
                          description: '',
                          datasourceType: 'mysql',
                          datasourceParams: '{"host":"localhost","dbname":"test","username":"root",' +
                          '"password":"AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw=="}',
                          version: 1,
                          kibanaSavedObjectMeta: {
                            searchSourceJSON: '{}'
                          }
                        }
                      }
                    ]
                  }
                });
              default:
                expect.fail(`Unknown method: ${method}`);
            }
          }
        };
      }
    }
  }
};
const fakeKibiYmlPath    = __dirname + '/../../../../fixtures/fake_kibi.yml';
const fakeKibiYmlBakPath = __dirname + '/../../../../fixtures/fake_kibi.yml.bak';

let indexHelper;

describe('Index Helper', function () {

  describe('swapKibiYml', function () {

    beforeEach(function () {
      sinon.stub(fs, 'readFile', (path, enc, cb) => {
        if (path === 'nofile') {
          cb(new Error('File not found'));
        } else {
          cb(undefined, 'datasource_encryption_algorithm: olga\n' +
            'datasource_encryption_key: yek\n' +
            'unchanged: unchanged');
        }
      });
      sinon.stub(fs, 'rename', (curPath, newPath, cb) => {
        if (curPath === 'norename') {
          cb(new Error(''));
        } else {
          cb();
        }
      });
      sinon.stub(fs, 'writeFile', (path, enc, cb) => cb(new Error('')));

      mockery.enable({
        warnOnReplace: true,
        warnOnUnregistered: false,
        useCleanCache: true
      });
      mockery.registerMock('fs', fs);
      indexHelper = new IndexHelper(fakeServer);
    });

    it('should fail when the file can\'t be read', function (done) {
      indexHelper.swapKibiYml('nofile', 'algo', 'key')
        .then(function () {
          done(new Error('Unexpected success.'));
        })
        .catch(function () {
          done();
        });
    });

    it('should fail when the file can\'t be backed up', function (done) {
      indexHelper.swapKibiYml('norename', 'algo', 'key')
        .then(() => {
          done(new Error('Unexpected success.'));
        })
        .catch((error) => {
          try {
            expect(error.message)
              .to.equal('Could not rename file "norename", please replace its contents ' +
              'with the following:\n\n' +
              `datasource_encryption_algorithm: 'algo'\n` +
              `datasource_encryption_key: 'key'\n` +
              'unchanged: unchanged');
            done();
          } catch (error) {
            done(error);
          }
        });
    });

    it('should fail when the file can\'t be written', function (done) {
      indexHelper.swapKibiYml('somefile', 'algo', 'key')
        .then(() => done(new Error('Unexpected success.')))
        .catch((error) => {
          try {
            expect(error.message)
              .to.equal('Could not write file "somefile", please check the permissions of the directory and write ' +
              'the following configuration to the file:\n\n' +
              `datasource_encryption_algorithm: 'algo'\n` +
              `datasource_encryption_key: 'key'\n` +
              'unchanged: unchanged');
            done();
          } catch (error) {
            done(error);
          }
        });
    });

    afterEach(function (done) {
      fs.readFile.restore();
      fs.rename.restore();
      fs.writeFile.restore();
      mockery.disable();
      mockery.deregisterAll();
      done();
    });

  });

  describe('rencryptAllValuesInKibiIndex should fail', function () {

    indexHelper = new IndexHelper(fakeServer);

    it('when no old key', function (done) {
      indexHelper.rencryptAllValuesInKibiIndex().catch(function (err) {
        expect(err.message).to.equal('oldkey not defined');
        done();
      });
    });

    it('when no algorithm', function (done) {
      indexHelper.rencryptAllValuesInKibiIndex('oldkey', null, 'newkey', 'path').catch(function (err) {
        expect(err.message).to.equal('algorithm not defined');
        done();
      });
    });

    it('when no key', function (done) {
      indexHelper.rencryptAllValuesInKibiIndex('oldkey', 'algorithm', null, 'path').catch(function (err) {
        expect(err.message).to.equal('key not defined');
        done();
      });
    });

    it('when no path', function (done) {
      indexHelper.rencryptAllValuesInKibiIndex('oldkey', 'algorithm', 'key', null).catch(function (err) {
        expect(err.message).to.equal('path not defined');
        done();
      });
    });

    it('when not supported algorithm', function (done) {
      indexHelper.rencryptAllValuesInKibiIndex('oldkey', 'algorithm', 'newkey', 'path').catch(function (err) {
        expect(err.message.indexOf('Unsupported algorithm. Use one of') === 0).to.be(true);
        done();
      });
    });

  });

  describe('rencryptAllValuesInKibiIndex should work', function () {
    indexHelper = new IndexHelper(fakeServer);

    after(function (done) {
      // if there is fake_kibi.yml.bak in fixtures
      // rename it back to fake_kibi.yml
      fs.exists(fakeKibiYmlBakPath, function (exists) {
        if (!exists) {
          // there is no such file
          done();
        } else {
          fs.rename(fakeKibiYmlBakPath, fakeKibiYmlPath, function (err) {
            done();
          });
        }
      });
    });

    it('reencrypt with the same key to check that file was created', function (done) {
      indexHelper.rencryptAllValuesInKibiIndex(
        'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=', 'AES-GCM',
        'JhWzsL2ZrgiaPjv+sHtMIPSDxu3yfPvNqMSQoEectxo=', fakeKibiYmlPath)
      .then(function () {
        expect(fs.existsSync(fakeKibiYmlPath)).to.equal(true);
        expect(fs.existsSync(fakeKibiYmlBakPath)).to.equal(true);
        done();
      }).catch(done);
    });
  });

});
