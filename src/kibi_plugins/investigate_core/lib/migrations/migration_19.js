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

  _isUpgradeable(_source) {
    let dashboardStrategy = _source[DASHBOARD_STRATEGY_KEY];
    if (dashboardStrategy) {
      if (typeof dashboardStrategy !== 'string') {
        this._logger.error('Error expected ' + DASHBOARD_STRATEGY_KEY + ' value to be a string but got ' + dashboardStrategy);
        return;
      } else {
        try {
          dashboardStrategy = JSON.parse(dashboardStrategy);
        } catch (e) {
          this._logger.error('Error while parsing the strategy [' + dashboardStrategy + ']', e);
          return;
        }
      }
      if (dashboardStrategy.name === undefined) {
        return true;
      }
    }
    let buttonStrategy = _source[BUTTON_STRATEGY_KEY];
    if (buttonStrategy) {
      if (typeof buttonStrategy !== 'string') {
        this._logger.error('Error expected ' + BUTTON_STRATEGY_KEY + ' value to be a string but got ' + buttonStrategy);
        return;
      } else {
        try {
          buttonStrategy = JSON.parse(buttonStrategy);
        } catch (e) {
          this._logger.error('Error while parsing the strategy [' + buttonStrategy + ']', e);
          return;
        }
      }
      if (buttonStrategy.name === undefined) {
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

    let dashboardStrategy = _source[DASHBOARD_STRATEGY_KEY];
    if (dashboardStrategy) {
      if (typeof dashboardStrategy !== 'string') {
        this._logger.error('Error expected ' + DASHBOARD_STRATEGY_KEY + ' value to be a string but got ' + dashboardStrategy);
        return;
      } else {
        try {
          dashboardStrategy = JSON.parse(dashboardStrategy);
        } catch (e) {
          this._logger.error('Error while parsing the strategy [' + dashboardStrategy + ']', e);
          return;
        }
      }
      if (dashboardStrategy.name === undefined) {
        dashboardStrategy.name = 'default';
        _source[DASHBOARD_STRATEGY_KEY] = JSON.stringify(dashboardStrategy);
        count = 1;
      }
    }

    let buttonStrategy = _source[BUTTON_STRATEGY_KEY];
    if (buttonStrategy) {
      if (typeof buttonStrategy !== 'string') {
        this._logger.error('Error expected ' + BUTTON_STRATEGY_KEY + ' value to be a string but got ' + buttonStrategy);
        return;
      } else {
        try {
          buttonStrategy = JSON.parse(buttonStrategy);
        } catch (e) {
          this._logger.error('Error while parsing the strategy [' + buttonStrategy + ']', e);
          return;
        }
      }
      if (buttonStrategy.name === undefined) {
        buttonStrategy.name = 'default';
        _source[BUTTON_STRATEGY_KEY] = JSON.stringify(buttonStrategy);
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
