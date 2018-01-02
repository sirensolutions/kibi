import Dump from './_dump';
import { get } from 'lodash';
import Promise from 'bluebird';
import { mkdir, access } from 'fs';

/**
 * BackupKibi writes into a file the data and mappings of the kibi index.
 * If the ACL plugin is present, it saves also the ACL index.
 *
 * @param config the kibi.yml config
 * @param backupDir the path to the folder to write to
 */
export default class BackupKibi {
  constructor(config, backupDir) {
    this._config = config;
    this._backupDir = backupDir;
    this._dump = new Dump(config, backupDir);
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

    const kibiIndex = get(this._config, 'kibana.index', '.kibi');

    await this._dump.fromElasticsearchToFile(kibiIndex, 'data');
    await this._dump.fromElasticsearchToFile(kibiIndex, 'mapping');
    if (get(this._config, 'investigate_access_control.acl.enabled')) {
      const aclIndex = get(this._config, 'investigate_access_control.acl.index');
      await this._dump.fromElasticsearchToFile(aclIndex, 'data');
      await this._dump.fromElasticsearchToFile(aclIndex, 'mapping');
    }
  }
}
