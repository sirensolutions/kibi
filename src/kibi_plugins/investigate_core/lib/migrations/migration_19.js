import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Investigate Core - Migration 19
 *
 * Looks for the following two keys in config object
 * siren:countFetchingStrategyDashboards
 * siren:countFetchingStrategyRelationalFilters
 *
 * Checks if strategy objects have the "name" property set
 * If not adds the "name" = "default"
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
  }

  static get description() {
    return 'Migrate siren:countFetchingStrategyDashboards and siren:countFetchingStrategyRelationalFilters ' +
           'objects with missing "name" property';
  }

  _isUpgradeable(_source) {
    if (_source['siren:countFetchingStrategyDashboards']) {
      const strategy = JSON.parse(_source['siren:countFetchingStrategyDashboards']);
      if (strategy.name === undefined) {
        return true;
      }
    }
    if (_source['siren:countFetchingStrategyRelationalFilters']) {
      const strategy = JSON.parse(_source['siren:countFetchingStrategyRelationalFilters']);
      if (strategy.name === undefined) {
        return true;
      }
    }
    return false;
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    // we assume there is only 1 config with id == siren
    const _source = objects[0]._source;
    if (this._isUpgradeable(_source)) {
      return 1;
    }
    return 0;
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    let count = 0;
    const obj = objects[0];
    const _source = obj._source;
    if (_source['siren:countFetchingStrategyDashboards']) {
      const strategy = JSON.parse(_source['siren:countFetchingStrategyDashboards']);
      if (strategy.name === undefined) {
        strategy.name = 'default';
        _source['siren:countFetchingStrategyDashboards'] = JSON.stringify(strategy);
        count = 1;
      }
    }
    if (_source['siren:countFetchingStrategyRelationalFilters']) {
      const strategy = JSON.parse(_source['siren:countFetchingStrategyRelationalFilters']);
      if (strategy.name === undefined) {
        strategy.name = 'default';
        _source['siren:countFetchingStrategyRelationalFilters'] = JSON.stringify(strategy);
        count = 1;
      }
    }
    const body = JSON.stringify({
      update: {
        _index: obj._index,
        _type: obj._type,
        _id: obj._id
      }
    }) + '\n' +
    JSON.stringify({ doc: _source }) + '\n';

    if (count > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return count;
  }
}
