import readline from 'readline';
import Promise from 'bluebird';
import { createReadStream, access } from 'fs';

/**
 * RestoreKibiIndex takes a dump file created by the backup command and adds its objects to the kibi index.
 */
export default class RestoreKibiIndex {
  /**
   * @param server kibana server
   * @param fromFile dump file
   */
  constructor(server, fromFile) {
    this._server = server;
    this._fromFile = fromFile;
    this._kbnIndex = server.config().get('kibana.index');
    this._client = server.plugins.elasticsearch.getCluster('admin').getClient();
  }

  /**
   * _prepareIndex checks that the kibi index to write to is empty and initializes it
   */
  async _prepareIndex() {
    let indices;
    try {
      indices = await this._client.cat.indices({
        format: 'json',
        index: this._kbnIndex
      });
    } catch (err) {
      indices = [];
    }
    if (indices.length && indices[0]['docs.count'] !== '0') {
      throw new Error(`The ${this._kbnIndex} index exists and contains ${indices[0]['docs.count']} objects. Please delete it first.`);
    } else {
      // if the index to write to exists but is empty then delete it
      // this was created by kibana server when it started
      await this._client.indices.delete({ index: this._kbnIndex });
    }

    await this._createIndex();
  }

  /**
   * _createIndex creates the kibi index and sets its mappings
   */
  async _createIndex() {
    await this._client.indices.create({ index: this._kbnIndex });
    await this._client.indices.putMapping({
      index: this._kbnIndex,
      updateAllTypes: true,
      type: '_default_',
      body: {
        '_default_': {
          properties: {
            version: {
              type: 'integer'
            }
          }
        }
      }
    });
    await this._client.indices.putMapping({
      index: this._kbnIndex,
      type: 'search',
      body: {
        search: {
          properties: {
            hits: {
              type: 'integer'
            }
          }
        }
      }
    });
  }

  /**
   * _count returns the number of saved objects to restore
   *
   * @returns the count
   */
  async _count() {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: createReadStream(this._fromFile)
      });
      let count = 0;

      rl.on('line', () => count++);
      rl.on('close', () => resolve(count));
    });
  }

  /**
   * _restoreIndex restores the backup contained in the file, with one saved object per line
   */
  async _restoreIndex() {
    let count = await this._count();

    this._server.log(['info', 'restore'], `Restoring ${count} objects to ${this._kbnIndex} index`);
    return new Promise(async (resolve, reject) => {
      const rlBackup = readline.createInterface({
        input: createReadStream(this._fromFile)
      });

      rlBackup.on('line', async json => {
        const object = JSON.parse(json);
        try {
          const res = await this._client.create({
            index: this._kbnIndex,
            type: object._type,
            id: object._id,
            body: object._source
          });
          if (--count === 0) {
            this._server.log(['info', 'restore'], `Done restoring the ${this._kbnIndex} index from the backup [${this._fromFile}]`);
            resolve();
          }
        } catch (err) {
          rlBackup.close();
          reject(err);
        }
      });
    });
  }

  /**
   * restore the backup
   */
  async restore() {
    // check if the file to restore from exists
    let fileExists = false;
    try {
      await Promise.fromNode(cb => access(this._fromFile, cb));
      fileExists = true;
    } catch (err) {
      // ignore
    }
    if (!fileExists) {
      throw new Error(`Cannot restore the kibi index from non-accessible file [${this._fromFile}]`);
    }

    await this._prepareIndex();
    await this._restoreIndex();
  }
}
