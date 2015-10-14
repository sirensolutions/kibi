/*global __dirname */
var root = require('requirefrom')('');
var expect = require('expect.js');
var mockery = require('mockery');
var Promise = require('bluebird');
var fs = require('fs');

var fake_kibi_yml_path      = __dirname + '/../../../fixtures/fake_kibi.yml';
var fake_kibi_yml_back_path = __dirname + '/../../../fixtures/fake_kibi.yml.back';

describe('Index Helper', function () {

  describe('rencryptAllValuesInKibiIndex should fail', function () {

    var indexHelper = root('src/server/lib/kibi/index_helper');

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
        expect(err.message.indexOf('not supported algorithm. Use one of') === 0).to.equal(true);
        done();
      });
    });

  });

  describe('rencryptAllValuesInKibiIndex should work', function () {

    before(function (done) {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('request-promise', function (rp_options) {
        // here return different resp depends on rp_options.href
        if (rp_options.uri.href === 'http://localhost:9200/.kibi/_bulk') {
          return Promise.resolve(
            {}
          );
        } else if (rp_options.uri.href === 'http://localhost:9200/.kibi/datasource/_search?size=100') {
          return Promise.resolve(
            [
              {
                _index: '.kibi',
                _type: 'datasource',
                _id: 'mysql-test',
                _score: 1,
                _source: {
                  title: 'mysql test datasource',
                  description: '',
                  datasourceType: 'mysql',
                  datasourceParams: '{"host":"localhost","dbname":"test","username":"root","password":"aes-256-ctr:3b28a10425fd"}',
                  version: 1,
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: '{}'
                  }
                }
              }
            ]
          );
        }

      });

      done();
    });

    after(function (done) {
      mockery.disable();
      mockery.deregisterAll();

      // if there is fake_kibi.yml.back in fixtures
      // rename it back to fake_kibi.yml
      fs.exists(fake_kibi_yml_back_path, function (exists) {
        if (!exists) {
          // there is no such file
          done();
        } else {
          fs.rename(fake_kibi_yml_back_path, fake_kibi_yml_path, function (err) {
            done();
          });
        }
      });
    });

    it('1', function (done) {
      var indexHelper = root('src/server/lib/kibi/index_helper');
      var expected = [
      'Got 1 datasources.',
      'param: password value: aes-256-ctr:3b28a10425fd',
      'decrypted value',
      'encrypted the value',
      'Saving new kibi.yml',
      'New kibi.yml saved. Old kibi.yml moved to kibi.yml.back',
      'DONE'];

      indexHelper.rencryptAllValuesInKibiIndex(
        '3zTvzr3p67VC61jmV54rIYu1545x4TlX', 'aes-256-ctr',
        '3zTvzr3p67VC61jmV54rIYu1545x4TlX', fake_kibi_yml_path)
      .then(function (report) {
        expect(report).to.eql(expected);
        expect(fs.existsSync(fake_kibi_yml_path)).to.equal(true);
        expect(fs.existsSync(fake_kibi_yml_back_path)).to.equal(true);
        done();
      });
    });
  });

});
