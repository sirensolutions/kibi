import rimraf from 'rimraf';
import Promise from 'bluebird';
import { mkdtemp } from 'fs';
import RestoreKibiIndex from '../restore_kibi_index';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

describe('Restore Kibi Index', function () {
  let config;
  let tmpDir;

  beforeEach(async function () {
    config = {
      kibana: {
        index: '.kibi2'
      },
      elasticsearch: {
        url: 'http://localhost:9200'
      }
    };
    tmpDir = await Promise.fromNode(cb => mkdtemp('/tmp/backup-', cb));
  });

  afterEach(function (done) {
    rimraf(tmpDir, done);
  });

  it('should fail if backup folder does not exist', async function () {
    const restoreKibiIndex = new RestoreKibiIndex(config, `${tmpDir}/test`);
    try {
      await restoreKibiIndex.restore();
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be(`Backup folder [${tmpDir}/test] does not exist`);
    }
  });

  it('should restore the data and mappings of the kibi index', async function () {
    const restoreIndexStub = sinon.stub(RestoreKibiIndex.prototype, '_restoreIndex');
    const restoreKibiIndex = new RestoreKibiIndex(config, tmpDir);

    await restoreKibiIndex.restore();
    sinon.assert.calledTwice(restoreIndexStub);
    sinon.assert.calledWith(restoreIndexStub.firstCall, '.kibi2', 'mapping');
    sinon.assert.calledWith(restoreIndexStub.secondCall, '.kibi2', 'data');
  });

  it('should restore the data and mappings of both ACL and kibi indices', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: true,
        index: 'acl'
      }
    };
    const restoreIndexStub = sinon.stub(RestoreKibiIndex.prototype, '_restoreIndex');
    const restoreKibiIndex = new RestoreKibiIndex(config, tmpDir);

    await restoreKibiIndex.restore();
    sinon.assert.callCount(restoreIndexStub, 4);
    if (restoreIndexStub.firstCall.args[0] === '.kibi2') {
      sinon.assert.calledWith(restoreIndexStub.getCall(0), '.kibi2', 'mapping');
      sinon.assert.calledWith(restoreIndexStub.getCall(1), '.kibi2', 'data');
      sinon.assert.calledWith(restoreIndexStub.getCall(2), 'acl', 'mapping');
      sinon.assert.calledWith(restoreIndexStub.getCall(3), 'acl', 'data');
    } else {
      sinon.assert.calledWith(restoreIndexStub.getCall(0), 'acl', 'mapping');
      sinon.assert.calledWith(restoreIndexStub.getCall(1), 'acl', 'data');
      sinon.assert.calledWith(restoreIndexStub.getCall(2), '.kibi2', 'mapping');
      sinon.assert.calledWith(restoreIndexStub.getCall(3), '.kibi2', 'data');
    }
  });

  it('should not restore the ACL index if disabled', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: false,
        index: 'acl'
      }
    };
    const restoreIndexStub = sinon.stub(RestoreKibiIndex.prototype, '_restoreIndex');
    const restoreKibiIndex = new RestoreKibiIndex(config, tmpDir);

    await restoreKibiIndex.restore();
    sinon.assert.calledTwice(restoreIndexStub);
    sinon.assert.calledWith(restoreIndexStub.firstCall, '.kibi2', 'mapping');
    sinon.assert.calledWith(restoreIndexStub.secondCall, '.kibi2', 'data');
  });
});
