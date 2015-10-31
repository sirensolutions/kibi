var root = require('requirefrom')('');
var expect = require('expect.js');
var mockery = require('mockery');
var Promise = require('bluebird');
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

  it('should not set configure properties for null username and password', function () {
    var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
    var jdbcHelper = new JdbcHelper();
    var conf = {
      libpath: '/'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.length).to.be(0);
  });

  it('should configure the username if specified', function () {
    var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
    var jdbcHelper = new JdbcHelper();
    var conf = {
      libpath: '/',
      username: 'username'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.length).to.be(1);
    expect(actual.properties[0]).to.eql(['user', 'username']);
  });

  it('should configure the password if specified', function () {
    var cryptoHelper = root('src/server/lib/sindicetech/crypto_helper');
    sinon.stub(cryptoHelper, 'decrypt').returns('pass');

    var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
    var jdbcHelper = new JdbcHelper();
    var conf = {
      libpath: '/',
      password: 'pass'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.length).to.be(1);
    expect(actual.properties[0]).to.eql(['password', 'pass']);

    cryptoHelper.decrypt.restore();
  });

  it('should configure both credentials if specified', function () {
    var cryptoHelper = root('src/server/lib/sindicetech/crypto_helper');
    sinon.stub(cryptoHelper, 'decrypt').returns('pass');

    var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
    var jdbcHelper = new JdbcHelper();
    var conf = {
      libpath: '/',
      username: 'username',
      password: 'pass'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.length).to.be(2);
    expect(actual.properties[0]).to.eql(['user', 'username']);
    expect(actual.properties[1]).to.eql(['password', 'pass']);

    cryptoHelper.decrypt.restore();
  });


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

    describe('getRelativePathToNodeModulesFolder', function () {

      it('development', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\server\\lib\\sindicetech'
        );

        expect(jdbcHelper.getRelativePathToNodeModulesFolder()).to.equal('..\\..\\..\\..\\node_modules\\');
      });

      it('production', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\lib\\sindicetech'
        );

        expect(jdbcHelper.getRelativePathToNodeModulesFolder()).to.equal('..\\..\\node_modules\\');
      });

    });


    describe('getAbsolutePathToSindicetechFolder', function () {

      it('development', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\server\\lib\\sindicetech'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('C:\\Users\\kibi\\');
      });

      it('production', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\lib\\sindicetech'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('C:\\Users\\kibi\\');
      });

    });


    describe('prepareJdbcConfig', function () {

      it('absolute libpath', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        var conf = {
          libpath: 'C:\\Users\\libs\\pg.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\pg.jar');
      });

      it('relative libpath', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs'
        );

        var conf = {
          libpath: '\\kibilibs\\pg.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\kibilibs\\pg.jar');
      });

      it('libs', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs\\'
        );

        var conf = {
          libpath: 'C:\\Users\\libs\\pg.jar',
          libs: ['C:\\lib\\a.jar', 'another.jar']
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\pg.jar');
        expect(actual.libs).to.eql(['C:\\lib\\a.jar', 'C:\\Users\\libs\\another.jar']);
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


    describe('getRelativePathToNodeModulesFolder', function () {

      it('development', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/server/lib/sindicetech'
        );

        expect(jdbcHelper.getRelativePathToNodeModulesFolder()).to.equal('../../../../node_modules/');
      });

      it('production', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/lib/sindicetech'
        );

        expect(jdbcHelper.getRelativePathToNodeModulesFolder()).to.equal('../../node_modules/');
      });
    });


    describe('getAbsolutePathToSindicetechFolder', function () {

      it('development', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/server/lib/sindicetech'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('/opt/kibi/');
      });

      it('production', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/lib/sindicetech'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('/opt/kibi/');
      });
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

      it('libs', function () {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');
        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );
        var conf = {
          libpath: '/opt/libs/pg.jar',
          libs: ['/opt/libs/a.jar', 'another.jar']
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/pg.jar');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

    });

    describe('prepareJdbcPaths', function () {

      it('normal flow', function (done) {
        var JdbcHelper = root('src/server/lib/sindicetech/jdbcHelper');

        var IndexHelper = root('src/server/lib/kibi/index_helper');
        sinon.stub(IndexHelper, 'getDatasources').returns(Promise.resolve([
          {
            id: 'pg',
            _source: {
              datasourceType: 'sql_jdbc',
              datasourceParams: '{"libpath": "/opt/libs/pg.jar"}'
            }
          },
          {
            id: 'mysql',
            _source: {
              datasourceType: 'sql_jdbc',
              datasourceParams: '{"libpath": "/opt/libs/mysql.jar"}'
            }
          },
          {
            id: 'mysql2',
            _source: {
              datasourceType: 'mysql'
            }
          },
          {
            id: 'corrupted',
            _source: {
              datasourceType: 'sql_jdbc',
              datasourceParams: '{bpath": "/opt/libs/mysql.jar"}'
            }
          }
        ]));

        var jdbcHelper = new JdbcHelper();
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );

        jdbcHelper.prepareJdbcPaths().then(function (paths) {
          expect(paths.libpaths).to.eql(['/opt/libs/pg.jar', '/opt/libs/mysql.jar']);
          expect(paths.libs.length).to.be(0);
          IndexHelper.getDatasources.restore();
          done();
        }).catch(function (err) {
          IndexHelper.getDatasources.restore();
          done(err);
        });

      });

    });

  });


});

