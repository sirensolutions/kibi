var expect = require('expect.js');
var mockery = require('mockery');
var Promise = require('bluebird');
var sinon = require('sinon');
var fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
        if (key === 'elasticsearch.url') {
          return 'http://localhost:12345';
        } else if (key === 'kibana.index') {
          return '.kibi';
        } else {
          return '';
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      client: {
        search: function (options) {
          if (options.type === 'datasource') {
            const datasources = [
              {
                _id: 'pg',
                _source: {
                  datasourceType: 'sql_jdbc',
                  datasourceParams: '{"libpath": "/opt/libs1/", "libs": "a.jar"}'
                }
              },
              {
                _id: 'mysql',
                _source: {
                  datasourceType: 'sql_jdbc',
                  datasourceParams: '{"libpath": "/opt/libs2/", "libs": "b.jar"}'
                }
              },
              {
                _id: 'mysql2',
                _source: {
                  datasourceType: 'mysql',
                  datasourceParams: '{"libpath": "/opt/libs2/", "libs": "b.jar"}'
                }
              },
              {
                _id: 'corrupted',
                _source: {
                  datasourceType: 'sql_jdbc',
                  datasourceParams: '{bpath": "/opt/libs3/", "libs": "c.jar"}'
                }
              }
            ];
            return Promise.resolve({
              hits: {
                hits: datasources,
                total: datasources.length
              }
            });
          }
          return Promise.reject(new Error('Unexpected search: ' + options));
        }
      }
    }
  }
};

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
    var JdbcHelper = require('../jdbc_helper');
    var jdbcHelper = new JdbcHelper(fakeServer);
    var conf = {
      libpath: '/'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.be(undefined);
    expect(actual.properties.password).to.be(undefined);
  });

  it('should configure the username if specified', function () {
    var JdbcHelper = require('../jdbc_helper');
    var jdbcHelper = new JdbcHelper(fakeServer);
    var conf = {
      libpath: '/',
      username: 'username'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.eql('username');
    expect(actual.properties.password).to.be(undefined);
  });

  it('should configure the password if specified', function () {
    var cryptoHelper = require('../crypto_helper');
    sinon.stub(cryptoHelper, 'decrypt').returns('pass');

    var JdbcHelper = require('../jdbc_helper');
    var jdbcHelper = new JdbcHelper(fakeServer);
    var conf = {
      libpath: '/',
      password: 'pass'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.be(undefined);
    expect(actual.properties.password).to.eql('pass');

    cryptoHelper.decrypt.restore();
  });

  it('should configure both credentials if specified', function () {
    var cryptoHelper = require('../crypto_helper');
    sinon.stub(cryptoHelper, 'decrypt').returns('pass');

    var JdbcHelper = require('../jdbc_helper');
    var jdbcHelper = new JdbcHelper(fakeServer);
    var conf = {
      libpath: '/',
      username: 'username',
      password: 'pass'
    };

    var actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.eql('username');
    expect(actual.properties.password).to.eql('pass');

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


    describe('getAbsolutePathToSindicetechFolder', function () {

      it('development', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\plugins\\kibi_core\\lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('C:\\Users\\kibi\\');
      });

      it('production', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\plugins\\kibi_core\\lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('C:\\Users\\kibi\\');
      });

    });


    describe('prepareJdbcConfig', function () {

      it('absolute libpath', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        var conf = {
          libpath: 'C:\\Users\\libs\\pg.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\pg.jar');
      });

      it('relative libpath', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
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
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs\\'
        );

        var conf = {
          libpath: 'C:\\Users\\libs\\',
          libs: 'C:\\lib\\a.jar,another.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\');
        expect(actual.libs).to.eql(['C:\\lib\\a.jar', 'C:\\Users\\libs\\another.jar']);
      });

      it('libs no slashes at the end of libpath', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs'
        );

        var conf = {
          libpath: 'C:\\Users\\libs',
          libs: 'C:\\lib\\a.jar,another.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs');
        expect(actual.libs).to.eql(['C:\\lib\\a.jar', 'C:\\Users\\libs\\another.jar']);
      });

      it('libs with spaces', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs\\'
        );

        var conf = {
          libpath: 'C:\\Users\\libs\\',
          libs: '  C:\\lib\\a.jar  ,  another.jar  '
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\');
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


    describe('getAbsolutePathToSindicetechFolder', function () {

      it('development', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/plugins/kibi_core/lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('/opt/kibi/');
      });

      it('production', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/plugins/kibi_core/lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('/opt/kibi/');
      });
    });

    describe('prepareJdbcConfig', function () {

      it('absolute libpath', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        var conf = {
          libpath: '/opt/libs'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs');
      });

      it('relative libpath', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
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
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );
        var conf = {
          libpath: '/opt/libs/',
          libs: '/opt/libs/a.jar,another.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

      it('libs no slash at the end of libpath', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs'
        );
        var conf = {
          libpath: '/opt/libs',
          libs: '/opt/libs/a.jar,another.jar'
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

      it('libs with spaces', function () {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );
        var conf = {
          libpath: '/opt/libs/',
          libs: '  /opt/libs/a.jar  ,  another.jar  '
        };

        var actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

    });

    describe('prepareJdbcPaths', function () {

      it('should collect all the libs for existing datasources', function (done) {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);

        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );

        jdbcHelper.prepareJdbcPaths().then(function (paths) {
          expect(paths.libs).to.eql(['/opt/libs1/a.jar','/opt/libs2/b.jar']);
          done();
        }).catch(function (err) {
          done(err);
        });

      });


      it('there should be no duplicates', function (done) {
        var JdbcHelper = require('../jdbc_helper');
        var jdbcHelper = new JdbcHelper(fakeServer);

        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );

        jdbcHelper.prepareJdbcPaths().then(function (paths) {
          expect(paths.libs).to.eql(['/opt/libs1/a.jar','/opt/libs2/b.jar']);
          done();
        }).catch(function (err) {
          done(err);
        });

      });

    });

  });


});

