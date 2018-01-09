import Dump from './_dump';
import { get } from 'lodash';
import Promise from 'bluebird';
import { access } from 'fs';


/**
 * RestoreKibi takes a dump file created by the backup command and adds its objects to the kibi index.
 */
export default class RestoreKibi {

  /**
   * @param config the investigate.yml config
   * @param backupDir the folder with the backuped indices
   */
  constructor(config, backupDir) {
    this._config = config;
    this._backupDir = backupDir;
    this._dump = new Dump(config, backupDir);
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

    const kibiIndex = get(this._config, 'kibana.index', '.siren');

    await this._dump.fromFileToElasticsearch(kibiIndex, 'mapping');
    await this._dump.fromFileToElasticsearch(kibiIndex, 'data');
    if (get(this._config, 'investigate_access_control.acl.enabled')) {
      const aclIndex = get(this._config, 'investigate_access_control.acl.index');
      await this._dump.fromFileToElasticsearch(aclIndex, 'mapping');
      await this._dump.fromFileToElasticsearch(aclIndex, 'data');
    }
  }
}
