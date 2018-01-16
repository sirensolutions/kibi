import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 18
 *
 * Looks for any advanced setting in the config object with the kibi: prefix
 * if found (and it matches one from the map below):
 * - change the prefix from 'kibi:' to 'investigate:'
 *    e.g. kibi:relations changes to siren:relations
 *
 * - then delete the old config object and index the new config object back into the cluster
 */

export default class Migration18 extends Migration {

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
      'timePrecision',
      'zoom',
      'relations',
      'joinTaskTimeout',
      'panel_vertical_size',
      'vertical_grid_resolution',
      'enableAllDashboardsCounts',
      'enableAllRelBtnCounts',
      'defaultDashboardId',
      'shieldAuthorizationWarning',
      'graphUseWebGl',
      'graphStatesLimit',
      'graphExpansionLimit',
      'graphRelationFetchLimit',
      'graphMaxConcurrentCalls',
      'countFetchingStrategyDashboards',
      'countFetchingStrategyRelationalFilters'
    ];
  }

  static get description() {
    return 'Migrate advanced settings with kibi:* prefix to siren:*';
  }

  _getUpgradeableKeys(object) {
    if (!object) {
      return [];
    } else {
      const keys = Object.keys(object);
      const upgradeableKeys = [];

      this.keyMap.map(keySuffix => {
        if (keys && Array.isArray(keys)) {
          if (keys.indexOf(`kibi:${keySuffix}`) !== -1) {
            upgradeableKeys.push(keySuffix);
          }
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
      keys.map(key => {
        if (key.match(/kibi:.*/)) {
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
        this._replaceKeys = upgradeableKey => {
          const newKey = `siren:${upgradeableKey}`;
          const oldKey = `kibi:${upgradeableKey}`;

          newSource[newKey] = newSource[oldKey];
          delete newSource[oldKey];
        };

        const upgradeableKeys = this._getUpgradeableKeys(obj._source);
        // replace any of the settings with kibi: prefix that are present in the keyMap above
        upgradeableKeys.map(this._replaceKeys);
        // remove any extraneous settings with a kibi: prefix as they are deprecated and would
        // remain as kibi:whatever otherwise
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
