import rimraf from 'rimraf';
import Promise from 'bluebird';
import { writeFile, mkdtemp } from 'fs';
import RestoreKibiIndex from '../restore_kibi_index';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

describe('Restore Kibi Index', function () {
  const catIndicesStub = sinon.stub();
  const createStub = sinon.stub();
  const indicesCreateStub = sinon.stub();
  const indicesDeleteStub = sinon.stub();
  const putMappingStub = sinon.stub();

  let tmpDir;
  let backupFile;
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
                indices: {
                  delete: indicesDeleteStub,
                  create: indicesCreateStub,
                  putMapping: putMappingStub
                },
                create: createStub,
                cat: {
                  indices: catIndicesStub
                }
              };
            }
          };
        }
      }
    },
    log: sinon.stub()
  };
  const fakeData = [
    {
      _index: '.old_kibi',
      _type: 'dashboard',
      _id: '1',
      _source: {
        aaa: 'aaa'
      }
    },
    {
      _index: '.old_kibi',
      _type: 'dashboard',
      _id: '2',
      _source: {
        bbb: 'bbb'
      }
    }
  ];

  beforeEach(async function () {
    tmpDir = await Promise.fromNode(cb => mkdtemp('/tmp/restore-', cb));
    backupFile = `${tmpDir}/backup.json`;

    let contents = '';
    for (const o of fakeData) {
      contents += `${JSON.stringify(o)}\n`;
    }
    await Promise.fromNode(cb => writeFile(backupFile, contents, cb));
  });

  afterEach(function (done) {
    rimraf(tmpDir, done);
  });

  it('should fail if file does not exist', async function () {
    try {
      const restoreKibiIndex = new RestoreKibiIndex(server, 'toto');
      await restoreKibiIndex.restore();
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be('Cannot restore the kibi index from non-accessible file [toto]');
    }
  });

  it('should abort if the index exists', async function () {
    const restoreKibiIndex = new RestoreKibiIndex(server, backupFile);

    catIndicesStub.returns(Promise.resolve([
      {
        index: '.kibi',
        'docs.count': '42'
      }
    ]));
    try {
      await restoreKibiIndex.restore();
      expect().fail('should fail');
    } catch (err) {
      expect(err.message).to.be('The .kibi index exists and contains 42 objects. Please delete it first.');
    }
  });

  it('should write all backup objects to the kibi index', async function () {
    const restoreKibiIndex = new RestoreKibiIndex(server, backupFile);

    catIndicesStub.returns(Promise.resolve([
      // automatically created by kibana
      {
        index: '.kibi',
        'docs.count': '0'
      }
    ]));
    await restoreKibiIndex.restore();

    sinon.assert.calledWith(indicesDeleteStub, sinon.match({ index: '.kibi' }));
    sinon.assert.calledWith(indicesCreateStub, sinon.match({ index: '.kibi' }));
    sinon.assert.called(putMappingStub);
    sinon.assert.callCount(createStub, fakeData.length);
    for (let i = 0; i < fakeData.length; i++) {
      const o = fakeData[i];
      sinon.assert.calledWith(createStub.getCall(i), sinon.match({
        index: '.kibi',
        type: o._type,
        id: o._id,
        body: o._source
      }));
    }
  });
});
