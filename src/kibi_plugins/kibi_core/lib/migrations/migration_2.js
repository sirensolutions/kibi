import { transform } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 2.
 *
 * Looks for saved templates having version set to `1` and:
 *
 * - renames attributes with the `st_` prefix in the name
 * - bumps version to `2`.
 */

export default class Migration2 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._logger = configuration.logger;
    this._type = 'template';
    this._query = {
      query: {
        match: {
          version: 1
        }
      }
    };
  }

  static get description() {
    return 'Upgrade saved templates from version 1 to version 2';
  }

  async count() {
    return await this.countHits(this._index, this._type, this._query);
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    for (const obj of objects) {
      const upgraded = this._upgradeObject(obj);
      body += JSON.stringify({
        update: {
          _index: obj._index,
          _type: obj._type,
          _id: obj._id
        }
      }) + '\n' + JSON.stringify({ doc: upgraded }) + '\n';
    }
    await this._client.bulk({
      refresh: true,
      body: body
    });
    return objects.length;
  }

  /**
   * Upgrades a single object.
   *
   * @param {Object} obj The object to upgrade.
   */
  _upgradeObject(obj) {
    const upgraded = transform(obj._source, (result, value, key) => {
      if (key.indexOf('st_') === 0) {
        key = key.replace(/^st_/, '');
        if (obj._source.hasOwnProperty(key)) {
          this._logger.warning(`Template with id ${obj._id} already contains an attribute named ${key}` +
                               `, will not remove attribute st_${key}`);
          return;
        }
        result[key] = value;
      }
    });
    upgraded.version = 2;
    return upgraded;
  }

}
