var root = require('requirefrom')('');
var expect = require('expect.js');
var mockery = require('mockery');
var sinon = require('sinon');

var endsWith = function (s, suffix) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

var getOsMock = function (platformStr) {
  return {
    platform: function () {
      return platformStr;
    },
    hostname: function () {
      return 'localhost';
    }
  };
};

describe('Jdbc Helper', function () {

  describe('windows', function () {

    before(function (done) {
      mockery.enable({
        warnOnReplace: true,
        warnOnUnregistered: false,
        useCleanCache: true
      });
      mockery.registerMock('os', getOsMock('windows'));
      done();
    });

    after(function (done) {
      mockery.disable();
      mockery.deregisterAll();
      done();
    });


    describe('prepareJdbcConfig', function () {

      it('absolute libpath', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        var conf = {
          libpath: 'C:\\\\Users\\libs'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\\\Users\\libs');
      });

      it('relative libpath', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\\\Users\\libs'
        );
        var conf = {
          libpath: '\\kibilibs'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\\\Users\\libs\\kibilibs');
      });

    });
  });


  describe('unix', function () {

    before(function (done) {
      mockery.enable({
        warnOnReplace: true,
        warnOnUnregistered: false,
        useCleanCache: true
      });
      mockery.registerMock('os', getOsMock('linux'));
      done();
    });

    after(function (done) {
      mockery.disable();
      mockery.deregisterAll();
      done();
    });

    describe('prepareJdbcConfig', function () {


      it('absolute libpath', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        var conf = {
          libpath: '/opt/libs'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs');
      });

      it('relative libpath', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );

        var conf = {
          libpath: 'kibilibs'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/kibilibs');
      });

    });
  });


});

