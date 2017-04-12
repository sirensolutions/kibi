import rimraf from 'rimraf';
import moment from 'moment';
import Promise from 'bluebird';
import { readFile, writeFile, mkdtemp } from 'fs';
import backupKibiIndex from '../backup_kibi_index';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

describe('Backup Kibi Index', function () {
  const scrollStub = sinon.stub();
  const searchStub = sinon.stub();
  let tmpDir;
  const server = {
    config() {
      return {
        get(id) {
          switch (id) {
            case 'kibana.index':
              return '.kibi';
            default:
              throw new Error(`Unknown config [${id}]`);
          }
        }
      };
    },
    plugins: {
      elasticsearch: {
        getCluster() {
          return {
            getClient() {
              return {
                scroll: scrollStub,
                search: searchStub
              };
            }
          };
        }
      }
    },
    log: sinon.stub()
  };

  beforeEach(async function () {
    tmpDir = await Promise.fromNode(cb => mkdtemp('/tmp/backup-', cb));
  });

  afterEach(function (done) {
    rimraf(tmpDir, done);
  });

  it('should fail if folder does not exist', async function () {
    try {
      await backupKibiIndex(server, 'asfafqwe897234ksjf');
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be('Folder [asfafqwe897234ksjf] does not exist');
    }
  });

  it('should fail if the file to backup to already exists', async function () {
    await Promise.fromNode(cb => writeFile(`${tmpDir}/backup-${moment().format('YYYY-MM-DD')}.json`, 'hello', cb));

    try {
      await backupKibiIndex(server, tmpDir);
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.match(/file already exists/);
    }
  });

  it('should write down all the objects from the kibi index', async function () {
    searchStub.returns(Promise.resolve({
      _scroll_id: 123,
      hits: {
        total: 42,
        hits: [
          {
            id: 'myid1'
          }
        ]
      }
    }));
    scrollStub
      .onFirstCall().returns(Promise.resolve({
        _scroll_id: 456,
        hits: {
          total: 42,
          hits: [
            {
              id: 'myid2'
            }
          ]
        }
      }))
      .onSecondCall().returns(Promise.resolve({
        _scroll_id: 789,
        hits: {
          total: 42,
          hits: []
        }
      }));

    const backupFile = await backupKibiIndex(server, tmpDir);
    sinon.assert.calledTwice(scrollStub);
    sinon.assert.calledWith(scrollStub.firstCall, sinon.match({ scrollId: 123 }));
    sinon.assert.calledWith(scrollStub.secondCall, sinon.match({ scrollId: 456 }));

    const contents = await Promise.fromNode(cb => readFile(backupFile, { encoding: 'UTF-8' }, cb));
    expect(contents).to.be(`${JSON.stringify({ id: 'myid1' })}\n${JSON.stringify({ id: 'myid2' })}\n`);
  });
});
