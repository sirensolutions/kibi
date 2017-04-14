import Elasticdump from 'elasticdump';
import { get } from 'lodash';
import Promise from 'bluebird';
import { mkdir, access } from 'fs';
import { join } from 'path';

const ELASTICSEACH_URL = 'http://localhost:9200';
const KIBI_INDEX = '.kibi';

/**
 * BackupKibiIndex writes into a file the data and mappings of the kibi index.
 * If the ACL plugin is present, it saves also the ACL index.
 *
 * @param config the kibi.yml config
 * @param toDir the path to the folder to write to
 */
export default class BackupKibiIndex {
  constructor(config, toDir) {
    this._config = config;
    this._backupDir = toDir;
  }

  async backup() {
    let dirExists;
    try {
      await Promise.fromNode(cb => access(this._backupDir, cb));
      dirExists = true;
    } catch (err) {
      dirExists = false;
    }
    if (dirExists) {
      throw new Error(`Backup folder [${this._backupDir}] already exists`);
    }
    await Promise.fromNode(cb => mkdir(this._backupDir, cb));

    const kibiIndex = get(this._config, 'kibana.index', KIBI_INDEX);

    await this._backupIndex(kibiIndex, 'data');
    await this._backupIndex(kibiIndex, 'mapping');
    if (get(this._config, 'kibi_access_control.acl.enabled')) {
      const aclIndex = get(this._config, 'kibi_access_control.acl.index');
      await this._backupIndex(aclIndex, 'data');
      await this._backupIndex(aclIndex, 'mapping');
    }
  }

  async _backupIndex(index, type) {
    const input = get(this._config, 'elasticsearch.url', ELASTICSEACH_URL);
    const output = join(this._backupDir, `${type}-${index}.json`);

    const options = {
      scrollTime: '1m',
      offset: 0,
      limit: 100,
      'input-index': index,
      type,
      input,
      output
    };
    const elasticdump = new Elasticdump(input, output, options);
    elasticdump.on('log', message => console.log(message));
    elasticdump.on('error', message => console.error(message));
    await Promise.fromNode(cb => elasticdump.dump(cb));
  }
}
