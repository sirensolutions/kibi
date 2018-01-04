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
    const javaCheck = gremlin._getJavaCheck();

    expect(ret).to.be(undefined);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);
  });

  it('should pass the Java 8 (Oracle) check - multiple strings', async function () {
    const javaVersion = [
      'java version "1.8.0_25"' + JSON.stringify(os.EOL),
      'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL),
      'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)'
    ];

    let ret = gremlin._checkJavaVersionString(javaVersion[0]);
    let javaCheck = gremlin._getJavaCheck();
    expect(ret).to.be(undefined);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);

    ret = gremlin._checkJavaVersionString(javaVersion[1]);
    javaCheck = gremlin._getJavaCheck();
    expect(ret).to.be(null);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);

    ret = gremlin._checkJavaVersionString(javaVersion[2]);
    javaCheck = gremlin._getJavaCheck();
    expect(ret).to.be(null);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);
  });

  it('should pass the Java 8 (OpenJDK) check - single string', async function () {
    const javaVersion =
        'openjdk version "1.8.0_25"' + JSON.stringify(os.EOL)
      + 'OpenJDK Runtime Environment (build 1.8.0_25-8u25-b17-0ubuntu4-14.04-b14)' + JSON.stringify(os.EOL)
      + 'OpenJDK 64-Bit Server VM (build 25.25-b02, mixed mode)';

    const ret = gremlin._checkJavaVersionString(javaVersion);
    const javaCheck = gremlin._getJavaCheck();

    expect(ret).to.be(undefined);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);
  });

  it('should pass the Java 8 (OpenJDK) check - multiple strings', async function () {
    const javaVersion = [
      'openjdk version "1.8.0_25"' + JSON.stringify(os.EOL),
      'OpenJDK Runtime Environment (build 1.8.0_25-8u25-b17-0ubuntu4-14.04-b14)' + JSON.stringify(os.EOL),
      'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)'
    ];

    let ret = gremlin._checkJavaVersionString(javaVersion[0]);
    let javaCheck = gremlin._getJavaCheck();
    expect(ret).to.be(undefined);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);

    ret = gremlin._checkJavaVersionString(javaVersion[1]);
    javaCheck = gremlin._getJavaCheck();
    expect(ret).to.be(null);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);

    ret = gremlin._checkJavaVersionString(javaVersion[2]);
    javaCheck = gremlin._getJavaCheck();
    expect(ret).to.be(null);
    expect(javaCheck.isOk).to.be(true);
    expect(javaCheck.checked).to.be(true);
  });

  it('should not pass the Java 8 check - single string', async function () {
    const javaVersion =
        'java version "1.7.0_60"' + JSON.stringify(os.EOL)
      + 'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL)
      + 'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)';

    const ret = gremlin._checkJavaVersionString(javaVersion);
    const javaCheck = gremlin._getJavaCheck();

    expect(javaCheck.isOk).to.be(false);
    expect(javaCheck.checked).to.be(true);
    expect(ret).to.be('Java version is lower than the requested 1.8. The Siren Gremlin Server needs Java 8 to run');
  });

  it('should not pass the Java 8 check - multiple strings', async function () {
    const javaVersion = [
      'java version "1.7.0_60"' + JSON.stringify(os.EOL),
      'Java(TM) SE Runtime Environment (build 1.8.0_25-b17)' + JSON.stringify(os.EOL),
      'Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)'
    ];

    let ret = gremlin._checkJavaVersionString(javaVersion[0]);
    const javaCheck = gremlin._getJavaCheck();
    expect(javaCheck.isOk).to.be(false);
    expect(javaCheck.checked).to.be(true);
    expect(ret).to.be('Java version is lower than the requested 1.8. The Siren Gremlin Server needs Java 8 to run');
    ret = gremlin._checkJavaVersionString(javaVersion[1]);
    expect(ret).to.be(null);
    ret = gremlin._checkJavaVersionString(javaVersion[2]);
    expect(ret).to.be(null);
  });

  it('should not pass the Java 8 check - java not installed', async function () {
    const javaVersion = 'some error complaining java is not installed';

    const ret = gremlin._checkJavaVersionString(javaVersion);
    const javaCheck = gremlin._getJavaCheck();
    expect(javaCheck.isOk).to.be(false);
    expect(javaCheck.checked).to.be(true);
    expect(ret).to.be('An error occurred while checking the installed Java version');
  });

  it('should find no other running gremlin server ', async function () {
    gremlin._ping = () => { return Promise.resolve(JSON.stringify({ status: 'ok' })); };

    gremlin._isAnotherGremlinRunning()
    .then(() => { expect(true).to.be(true); })
    .catch(() => { expect().fail('should fail'); });
  });

  it('should find another running gremlin server - unexpected response', async function () {
    gremlin._ping = () => { return Promise.resolve(JSON.stringify({ test: false })); };

    gremlin._isAnotherGremlinRunning()
    .then(() => { expect().fail('should fail');})
    .catch(() => { expect(true).to.be(true); });

  });

  it('should find another running gremlin server - exception', async function () {
    gremlin._ping = () => { throw new Error('some error'); };

    gremlin._isAnotherGremlinRunning()
    .then(() => { expect().fail('should fail'); })
    .catch(() => { expect(true).to.be(true); });
  });
});
