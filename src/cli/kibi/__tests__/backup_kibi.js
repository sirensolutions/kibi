import Dump from '../_dump';
import rimraf from 'rimraf';
import Promise from 'bluebird';
import { mkdtemp } from 'fs';
import BackupKibi from '../_backup_kibi';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

describe('Backup Kibi', function () {
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
    const backupKibi = new BackupKibi(config, tmpDir);
    try {
      await backupKibi.backup();
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be(`Backup folder [${tmpDir}] already exists`);
    }
  });

  it('should save the data and mappings of the kibi index', async function () {
    const fromElasticsearchToFileStub = sinon.stub(Dump.prototype, 'fromElasticsearchToFile');
    const backupKibi = new BackupKibi(config, `${tmpDir}/test`);

    await backupKibi.backup();
    sinon.assert.calledTwice(fromElasticsearchToFileStub);
    sinon.assert.calledWith(fromElasticsearchToFileStub, '.kibi', 'data');
    sinon.assert.calledWith(fromElasticsearchToFileStub, '.kibi', 'mapping');
  });

  it('should save the data and mappings of both ACL and kibi indices', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: true,
        index: 'acl'
      }
    };
    const fromElasticsearchToFileStub = sinon.stub(Dump.prototype, 'fromElasticsearchToFile');
    const backupKibi = new BackupKibi(config, `${tmpDir}/test`);

    await backupKibi.backup();
    sinon.assert.callCount(fromElasticsearchToFileStub, 4);
    sinon.assert.calledWith(fromElasticsearchToFileStub, '.kibi', 'data');
    sinon.assert.calledWith(fromElasticsearchToFileStub, '.kibi', 'mapping');
    sinon.assert.calledWith(fromElasticsearchToFileStub, 'acl', 'data');
    sinon.assert.calledWith(fromElasticsearchToFileStub, 'acl', 'mapping');
  });

  it('should not save the ACL index if disabled', async function () {
    config.kibi_access_control = {
      acl: {
        enabled: false,
        index: 'acl'
      }
    };
    const fromElasticsearchToFileStub = sinon.stub(Dump.prototype, 'fromElasticsearchToFile');
    const backupKibi = new BackupKibi(config, `${tmpDir}/test`);

    await backupKibi.backup();
    sinon.assert.calledTwice(fromElasticsearchToFileStub);
    sinon.assert.calledWith(fromElasticsearchToFileStub, '.kibi', 'data');
    sinon.assert.calledWith(fromElasticsearchToFileStub, '.kibi', 'mapping');
  });
});
