const expect = require('expect.js');
const mockery = require('mockery');
const Promise = require('bluebird');
const sinon = require('sinon');
const fakeServer = {
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

const endsWith = function (s, suffix) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

const getOsMock = function (platformStr) {
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
    const JdbcHelper = require('../jdbc_helper');
    const jdbcHelper = new JdbcHelper(fakeServer);
    const conf = {
      libpath: '/'
    };

    const actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.be(undefined);
    expect(actual.properties.password).to.be(undefined);
  });

  it('should configure the username if specified', function () {
    const JdbcHelper = require('../jdbc_helper');
    const jdbcHelper = new JdbcHelper(fakeServer);
    const conf = {
      libpath: '/',
      username: 'username'
    };

    const actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.eql('username');
    expect(actual.properties.password).to.be(undefined);
  });

  it('should configure the password if specified', function () {
    const cryptoHelper = require('../crypto_helper');
    sinon.stub(cryptoHelper, 'decrypt').returns('pass');

    const JdbcHelper = require('../jdbc_helper');
    const jdbcHelper = new JdbcHelper(fakeServer);
    const conf = {
      libpath: '/',
      password: 'pass'
    };

    const actual = jdbcHelper.prepareJdbcConfig(conf);
    expect(actual.properties.user).to.be(undefined);
    expect(actual.properties.password).to.eql('pass');

    cryptoHelper.decrypt.restore();
  });

  it('should configure both credentials if specified', function () {
    const cryptoHelper = require('../crypto_helper');
    sinon.stub(cryptoHelper, 'decrypt').returns('pass');

    const JdbcHelper = require('../jdbc_helper');
    const jdbcHelper = new JdbcHelper(fakeServer);
    const conf = {
      libpath: '/',
      username: 'username',
      password: 'pass'
    };

    const actual = jdbcHelper.prepareJdbcConfig(conf);
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
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\plugins\\kibi_core\\lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('C:\\Users\\kibi\\');
      });

      it('production', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          'C:\\Users\\kibi\\src\\plugins\\kibi_core\\lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('C:\\Users\\kibi\\');
      });

    });


    describe('prepareJdbcConfig', function () {

      it('absolute libpath', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        const conf = {
          libpath: 'C:\\Users\\libs\\pg.jar'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\pg.jar');
      });

      it('relative libpath', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs'
        );

        const conf = {
          libpath: '\\kibilibs\\pg.jar'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\kibilibs\\pg.jar');
      });

      it('libs', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs\\'
        );

        const conf = {
          libpath: 'C:\\Users\\libs\\',
          libs: 'C:\\lib\\a.jar,another.jar'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs\\');
        expect(actual.libs).to.eql(['C:\\lib\\a.jar', 'C:\\Users\\libs\\another.jar']);
      });

      it('libs no slashes at the end of libpath', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs'
        );

        const conf = {
          libpath: 'C:\\Users\\libs',
          libs: 'C:\\lib\\a.jar,another.jar'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('C:\\Users\\libs');
        expect(actual.libs).to.eql(['C:\\lib\\a.jar', 'C:\\Users\\libs\\another.jar']);
      });

      it('libs with spaces', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          'C:\\Users\\libs\\'
        );

        const conf = {
          libpath: 'C:\\Users\\libs\\',
          libs: '  C:\\lib\\a.jar  ,  another.jar  '
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
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
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/plugins/kibi_core/lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('/opt/kibi/');
      });

      it('production', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, '_getDirName').returns(
          '/opt/kibi/src/plugins/kibi_core/lib'
        );

        expect(jdbcHelper.getAbsolutePathToSindicetechFolder()).to.equal('/opt/kibi/');
      });
    });

    describe('prepareJdbcConfig', function () {

      it('absolute libpath', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        const conf = {
          libpath: '/opt/libs'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs');
      });

      it('relative libpath', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );

        const conf = {
          libpath: 'kibilibs'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/kibilibs');
      });

      it('libs', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );
        const conf = {
          libpath: '/opt/libs/',
          libs: '/opt/libs/a.jar,another.jar'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

      it('libs no slash at the end of libpath', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs'
        );
        const conf = {
          libpath: '/opt/libs',
          libs: '/opt/libs/a.jar,another.jar'
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

      it('libs with spaces', function () {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);
        sinon.stub(jdbcHelper, 'getAbsolutePathToSindicetechFolder').returns(
          '/opt/libs/'
        );
        const conf = {
          libpath: '/opt/libs/',
          libs: '  /opt/libs/a.jar  ,  another.jar  '
        };

        const actual = jdbcHelper.prepareJdbcConfig(conf);
        expect(actual.libpath).to.equal('/opt/libs/');
        expect(actual.libs).to.eql(['/opt/libs/a.jar', '/opt/libs/another.jar']);
      });

    });

    describe('prepareJdbcPaths', function () {

      it('should collect all the libs for existing datasources', function (done) {
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);

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
        const JdbcHelper = require('../jdbc_helper');
        const jdbcHelper = new JdbcHelper(fakeServer);

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

