const expect = require('expect.js');
const sinon = require('sinon');
const os = require('os');

let gremlin;

describe('Kibi Gremlin Server', function () {

  beforeEach(function () {
    const server = {
      expose: sinon.stub(),
      log: sinon.stub(),
      plugins: {
        elasticsearch: {
          getCluster() {
            return sinon.stub();
          }
        }
      }
    };
    const GremlinServerHandler = require('../gremlin_server');
    gremlin = new GremlinServerHandler(server);
  });

  it('should pass the Java 8 (Oracle) check - single string', async function () {
    const javaVersion =
        'java version "1.8.0_25"' + JSON.stringify(os.EOL)
      + 'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL)
      + 'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)';

    const ret = gremlin._checkJavaVersionString(javaVersion);

    expect(ret.v).to.be(true);
  });

  it('should pass the Java 8 (Oracle) check - multiple strings', async function () {
    const javaVersion = [
      'java version "1.8.0_25"' + JSON.stringify(os.EOL),
      'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL),
      'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)'
    ];

    let ret = gremlin._checkJavaVersionString(javaVersion[0]);
    expect(ret.v).to.be(true);
    ret = gremlin._checkJavaVersionString(javaVersion[1]);
    expect(ret).to.be(null);
    ret = gremlin._checkJavaVersionString(javaVersion[2]);
    expect(ret).to.be(null);
  });

  it('should pass the Java 8 (OpenJDK) check - single string', async function () {
    const javaVersion =
        'openjdk version "1.8.0_25"' + JSON.stringify(os.EOL)
      + 'OpenJDK Runtime Environment (build 1.8.0_25-8u25-b17-0ubuntu4-14.04-b14)' + JSON.stringify(os.EOL)
      + 'OpenJDK 64-Bit Server VM (build 25.25-b02, mixed mode)';

    const ret = gremlin._checkJavaVersionString(javaVersion);

    expect(ret.v).to.be(true);
  });

  it('should pass the Java 8 (OpenJDK) check - multiple strings', async function () {
    const javaVersion = [
      'openjdk version "1.8.0_25"' + JSON.stringify(os.EOL),
      'OpenJDK Runtime Environment (build 1.8.0_25-8u25-b17-0ubuntu4-14.04-b14)' + JSON.stringify(os.EOL),
      'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)'
    ];

    let ret = gremlin._checkJavaVersionString(javaVersion[0]);
    expect(ret.v).to.be(true);
    ret = gremlin._checkJavaVersionString(javaVersion[1]);
    expect(ret).to.be(null);
    ret = gremlin._checkJavaVersionString(javaVersion[2]);
    expect(ret).to.be(null);
  });

  it('should not pass the Java 8 check - single string', async function () {
    const javaVersion =
        'java version "1.7.0_60"' + JSON.stringify(os.EOL)
      + 'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL)
      + 'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)';

    const ret = gremlin._checkJavaVersionString(javaVersion);

    expect(ret.v).to.be(false);
    expect(ret.e).to.be('Java version is lower than the requested 1.8. The Kibi Gremlin Server needs Java 8 to run');
  });

  it('should not pass the Java 8 check - multiple strings', async function () {
    const javaVersion = [
      'java version "1.7.0_60"' + JSON.stringify(os.EOL),
      'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL),
      'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)'
    ];

    let ret = gremlin._checkJavaVersionString(javaVersion[0]);
    expect(ret.v).to.be(false);
    expect(ret.e).to.be('Java version is lower than the requested 1.8. The Kibi Gremlin Server needs Java 8 to run');
    ret = gremlin._checkJavaVersionString(javaVersion[1]);
    expect(ret).to.be(null);
    ret = gremlin._checkJavaVersionString(javaVersion[2]);
    expect(ret).to.be(null);
  });

  it('should not pass the Java 8 check - java not installed', async function () {
    const javaVersion = 'some error complaining java is not installed';

    const ret = gremlin._checkJavaVersionString(javaVersion);
    expect(ret.v).to.be(false);
    expect(ret.e).to.be('An error occurred while checking the installed Java version');
  });
});
