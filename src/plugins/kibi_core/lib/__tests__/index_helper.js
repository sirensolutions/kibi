/*global __dirname */
var expect = require('expect.js');
var Promise = require('bluebird');
var fs = require('fs');

var kibiIndex = '.kibi';
var fakeServer = {
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
      client: {
        bulk: function () {
          return Promise.resolve({});
        },
        search: function () {
          return Promise.resolve({
            hits: {
              total: 1,
              hits: [
                {
                  _index: '.kibi',
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
        }
      }
    }
  }
};
var fakeKibiYmlPath    = __dirname + '/../../../../fixtures/fake_kibi.yml';
var fakeKibiYmlBakPath = __dirname + '/../../../../fixtures/fake_kibi.yml.bak';


describe('Index Helper', function () {


  describe('rencryptAllValuesInKibiIndex should fail', function () {

    var IndexHelper = require('../index_helper');
    var indexHelper = new IndexHelper(fakeServer);

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
      var IndexHelper = require('../index_helper');
      var indexHelper = new IndexHelper(fakeServer);

      var expected = [
        'Got 1 datasources.',
        'param: password value: AES-GCM:NhxjhWFkEf8wrxfAA1oHo644:CgMFVVVQAAMAoAAA:FaPn/SPOXfqYMWNysdOkVw==',
        'decrypted value',
        'encrypted the value',
        'Saving new kibi.yml',
        'New kibi.yml saved. Old kibi.yml moved to kibi.yml.bak',
        'DONE'
      ];

      indexHelper.rencryptAllValuesInKibiIndex(
        'iSxvZRYisyUW33FreTBSyJJ34KpEquWznUPDvn+ka14=', 'AES-GCM',
        'JhWzsL2ZrgiaPjv+sHtMIPSDxu3yfPvNqMSQoEectxo=', fakeKibiYmlPath)
      .then(function (report) {
        expect(report).to.eql(expected);
        expect(fs.existsSync(fakeKibiYmlPath)).to.equal(true);
        expect(fs.existsSync(fakeKibiYmlBakPath)).to.equal(true);
        done();
      }).catch(done);
    });
  });

});
