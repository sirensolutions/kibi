import rimraf from 'rimraf';
import Promise from 'bluebird';
import { mkdtemp } from 'fs';
import BackupKibiIndex from '../backup_kibi_index';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

describe('Backup Kibi Index', function () {
  let config;
  let tmpDir;

  beforeEach(async function () {
    config = {
      kibana: {
        index: '.kibi'
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

  it('should fail if backup folder already exists', async function () {
    const backupKibiIndex = new BackupKibiIndex(config, tmpDir);
    try {
      await backupKibiIndex.backup();
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be(`Backup folder [${tmpDir}] already exists`);
    }
  });

  it('should save the data and mappings of the kibi index', async function () {
    const backupIndexStub = sinon.stub(BackupKibiIndex.prototype, '_backupIndex');
    const backupKibiIndex = new BackupKibiIndex(config, `${tmpDir}/test`);

    await backupKibiIndex.backup();
    sinon.assert.calledTwice(backupIndexStub);
    sinon.assert.calledWith(backupIndexStub, '.kibi', 'data');
    sinon.assert.calledWith(backupIndexStub, '.kibi', 'mapping');
  });

  it('should save the data and mappings of both ACL and kibi indices', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: true,
        index: 'acl'
      }
    };
    const backupIndexStub = sinon.stub(BackupKibiIndex.prototype, '_backupIndex');
    const backupKibiIndex = new BackupKibiIndex(config, `${tmpDir}/test`);

    await backupKibiIndex.backup();
    sinon.assert.callCount(backupIndexStub, 4);
    sinon.assert.calledWith(backupIndexStub, '.kibi', 'data');
    sinon.assert.calledWith(backupIndexStub, '.kibi', 'mapping');
    sinon.assert.calledWith(backupIndexStub, 'acl', 'data');
    sinon.assert.calledWith(backupIndexStub, 'acl', 'mapping');
  });

  it('should not save the ACL index if disabled', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: false,
        index: 'acl'
      }
    };
    const backupIndexStub = sinon.stub(BackupKibiIndex.prototype, '_backupIndex');
    const backupKibiIndex = new BackupKibiIndex(config, `${tmpDir}/test`);

    await backupKibiIndex.backup();
    sinon.assert.calledTwice(backupIndexStub);
    sinon.assert.calledWith(backupIndexStub, '.kibi', 'data');
    sinon.assert.calledWith(backupIndexStub, '.kibi', 'mapping');
  });
});
