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

const DASHBOARD_STRATEGY_KEY = 'siren:countFetchingStrategyDashboards';
const BUTTON_STRATEGY_KEY = 'siren:countFetchingStrategyRelationalFilters';

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
    return `Migrate ${DASHBOARD_STRATEGY_KEY} and ${BUTTON_STRATEGY_KEY} objects with missing "name" property`;
  }


  _isStrategyUpgradeable(strategy, propertyName) {
    if (typeof strategy !== 'string') {
      this._logger.error('Error expected ' + propertyName + ' to be a string but got ' + strategy);
      return undefined;
    } else {
      try {
        strategy = JSON.parse(strategy);
      } catch (e) {
        this._logger.error('Error while parsing the strategy [' + strategy + ']', e);
        return undefined;
      }
    }
    if (strategy.name === undefined) {
      return true;
    }
    return false;
  }

  _isSourceUpgradeable(_source) {
    let dashboardStrategy = _source[DASHBOARD_STRATEGY_KEY];
    if (dashboardStrategy) {
      const isUpgradeable = this._isStrategyUpgradeable(dashboardStrategy, DASHBOARD_STRATEGY_KEY);
      if (isUpgradeable === true) {
        return true;
      } else if (isUpgradeable === undefined) {
        // there was an error so return
        return;
      }
    }
    let buttonStrategy = _source[BUTTON_STRATEGY_KEY];
    if (buttonStrategy) {
      const isUpgradeable = this._isStrategyUpgradeable(buttonStrategy, BUTTON_STRATEGY_KEY);
      if (isUpgradeable === true) {
        return true;
      } else if (isUpgradeable === undefined) {
        // there was an error so return
        return;
      }
    }
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    // we assume there is only 1 config with id == siren
    const _source = objects[0]._source;
    if (this._isSourceUpgradeable(_source)) {
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

    let dashboardStrategy = _source[DASHBOARD_STRATEGY_KEY];
    if (dashboardStrategy) {
      const isUpgradeable = this._isStrategyUpgradeable(dashboardStrategy, DASHBOARD_STRATEGY_KEY);
      if (isUpgradeable === true) {
        dashboardStrategy = JSON.parse(dashboardStrategy);
        dashboardStrategy.name = 'dashboardStrategy';
        _source[DASHBOARD_STRATEGY_KEY] = JSON.stringify(dashboardStrategy);
        count = 1;
      } else if (isUpgradeable === undefined) {
        // there was an error so return
        return;
      }
    }

    let buttonStrategy = _source[BUTTON_STRATEGY_KEY];
    if (buttonStrategy) {
      const isUpgradeable = this._isStrategyUpgradeable(buttonStrategy, BUTTON_STRATEGY_KEY);
      if (isUpgradeable === true) {
        buttonStrategy = JSON.parse(buttonStrategy);
        buttonStrategy.name = 'relationalButtonStrategy';
        _source[BUTTON_STRATEGY_KEY] = JSON.stringify(buttonStrategy);
        count = 1;
      } else if (isUpgradeable === undefined) {
        // there was an error so return
        return;
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
