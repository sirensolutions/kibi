import Dump from '../_dump';
import rimraf from 'rimraf';
import Promise from 'bluebird';
import { mkdtemp } from 'fs';
import RestoreKibi from '../_restore_kibi';
import expect from 'expect.js';
import sinon from 'sinon';

describe('Restore Kibi', function () {
  let config;
  let tmpDir;
  let fromFileToElasticsearchStub;

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
    fromFileToElasticsearchStub = sinon.stub(Dump.prototype, 'fromFileToElasticsearch');
  });

  afterEach(function (done) {
    rimraf(tmpDir, done);
    fromFileToElasticsearchStub.restore();
  });

  it('should fail if backup folder does not exist', async function () {
    const restoreKibi = new RestoreKibi(config, `${tmpDir}/test`);
    try {
      await restoreKibi.restore();
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be(`Backup folder [${tmpDir}/test] does not exist`);
    }
  });

  it('should restore the data and mappings of the kibi index', async function () {
    const restoreKibi = new RestoreKibi(config, tmpDir);

    await restoreKibi.restore();
    sinon.assert.calledTwice(fromFileToElasticsearchStub);
    sinon.assert.calledWith(fromFileToElasticsearchStub.firstCall, '.kibi2', 'mapping');
    sinon.assert.calledWith(fromFileToElasticsearchStub.secondCall, '.kibi2', 'data');
  });

  it('should restore the data and mappings of both ACL and kibi indices', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: true,
        index: 'acl'
      }
    };
    const restoreKibi = new RestoreKibi(config, tmpDir);

    await restoreKibi.restore();
    sinon.assert.callCount(fromFileToElasticsearchStub, 4);
    if (fromFileToElasticsearchStub.firstCall.args[0] === '.kibi2') {
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(0), '.kibi2', 'mapping');
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(1), '.kibi2', 'data');
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(2), 'acl', 'mapping');
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(3), 'acl', 'data');
    } else {
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(0), 'acl', 'mapping');
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(1), 'acl', 'data');
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(2), '.kibi2', 'mapping');
      sinon.assert.calledWith(fromFileToElasticsearchStub.getCall(3), '.kibi2', 'data');
    }
  });

  it('should not restore the ACL index if disabled', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: false,
        index: 'acl'
      }
    };
    const restoreKibi = new RestoreKibi(config, tmpDir);

    await restoreKibi.restore();
    sinon.assert.calledTwice(fromFileToElasticsearchStub);
    sinon.assert.calledWith(fromFileToElasticsearchStub.firstCall, '.kibi2', 'mapping');
    sinon.assert.calledWith(fromFileToElasticsearchStub.secondCall, '.kibi2', 'data');
  });
});
