import Migration from 'kibiutils/lib/migrations/migration';
import { each, contains } from 'lodash';
/**
 * Kibi Core - Migration 25
 *
 * Looks for zoom, enableAllDashboardsCounts, shieldAuthorizationWarning in the config object
 * if found remove these options.
 */

export default class Migration25 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._logger = configuration.logger;
    this._type = 'config';
    this._query = {
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: 'siren'
              }
            }
          ]
        }
      }
    };

    this.keyMap = [
      'siren:zoom',
      'siren:enableAllDashboardsCounts',
      'siren:shieldAuthorizationWarning'
    ];
  }

  static get description() {
    return 'Remove siren:zoom, siren:enableAllDashboardsCounts, siren:shieldAuthorizationWarning from config object';
  }

  _getUpgradeableKeys(object) {
    if (!object) {
      return [];
    } else {
      const keys = Object.keys(object);
      const upgradeableKeys = [];

      each(keys, key => {
        if (contains(this.keyMap, key)) {
          upgradeableKeys.push(key);
        }
      });

      return upgradeableKeys;
    }
  }

  _removeDeprecatedKeys(object) {
    if (!object) {
      return;
    } else {
      const keys = Object.keys(object);
      each(keys, key => {
        if (contains(this.keyMap, key)) {
          delete object[key];
        }
      });

      return object;
    }
  }

  _isUpgradeable(object) {
    return this._getUpgradeableKeys(object).length;
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    return objects.reduce((count, obj) => {
      return this._isUpgradeable(obj._source);
    }, 0);
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let count = 0;

    for (const obj of objects) {
      if (this._isUpgradeable(obj._source) > 0) {
        let newSource = Object.assign({}, obj._source);

        const upgradeableKeys = this._getUpgradeableKeys(obj._source);
        newSource = this._removeDeprecatedKeys(newSource);

        count += upgradeableKeys.length;

        body += JSON.stringify({
          delete: {
            _index: obj._index,
            _type: obj._type,
            _id: obj._id
          }
        }) + '\n' +
        JSON.stringify({
          index: {
            _index: obj._index,
            _type: obj._type,
            _id: obj._id
          }
        }) + '\n' +
        JSON.stringify(newSource) + '\n';
      }
    }
    if (count > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return count;
  }
}
