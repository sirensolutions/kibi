import { get } from 'lodash';
import Elasticdump from 'elasticdump';
import Promise from 'bluebird';
import { access } from 'fs';
import { join } from 'path';

const ELASTICSEACH_URL = 'http://localhost:9200';
const KIBI_INDEX = '.kibi';

/**
 * RestoreKibiIndex takes a dump file created by the backup command and adds its objects to the kibi index.
 */
export default class RestoreKibiIndex {

  /**
   * @param config the kibi.yml config
   * @param backupDir the folder with the backuped indices
   */
  constructor(config, backupDir) {
    this._config = config;
    this._backupDir = backupDir;
  }

  async restore() {
    let dirExists;
    try {
      await Promise.fromNode(cb => access(this._backupDir, cb));
      dirExists = true;
    } catch (err) {
      dirExists = false;
    }
    if (!dirExists) {
      throw new Error(`Backup folder [${this._backupDir}] does not exist`);
    }

    const kibiIndex = get(this._config, 'kibana.index', KIBI_INDEX);

    await this._restoreIndex(kibiIndex, 'mapping');
    await this._restoreIndex(kibiIndex, 'data');
    if (get(this._config, 'kibi_access_control.acl.enabled')) {
      const aclIndex = get(this._config, 'kibi_access_control.acl.index');
      await this._restoreIndex(aclIndex, 'mapping');
      await this._restoreIndex(aclIndex, 'data');
    }
  }

  async _restoreIndex(index, type) {
    const input = join(this._backupDir, `${type}-${index}.json`);
    const output = get(this._config, 'elasticsearch.url', ELASTICSEACH_URL);

    const options = {
      scrollTime: '1m',
      offset: 0,
      limit: 100,
      'output-index': index,
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
