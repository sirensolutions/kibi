import Migration from 'kibiutils/lib/migrations/migration';
import _ from 'lodash';

/**
 * Investigate Core - Migration 23.
 *
 * Looks for:
 *
 * - the refreshInterval object within the kibana.index dashboard mapping
 *
 * Then:
 *
 * - if not found, adds the refreshInterval mapping object
 */
export default class Migration23 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._type = 'dashboard';
    this._defaultRefreshIntervalMapping = {
      properties: {
        display: {
          type:'text',
          fields: {
            keyword: {
              type:'keyword',
              ignore_above:256
            }
          }
        },
        pause: {
          type:'boolean'
        },
        section: {
          type:'long'
        },
        value: {
          type:'long'
        }
      }
    };
  }

  static get description() {
    return 'Add the refreshInterval mapping type to the mappings if it doesn\'t exist';
  }

 /**
   * Checks if dashboard mapping contains a property called "refreshInterval".
   */
  _isUpgradeable(mappings) {
    const dashboardMappingsProperties = mappings.dashboard.properties;
    return (dashboardMappingsProperties.refreshInterval) ? 0 : 1;
  }

  /**
   * Exposes the default refreshInterval mapping object
   */
  async getDefaultRefreshIntervalMapping() {
    return this._defaultRefreshIntervalMapping;
  }

  async count() {
    const dashboardMapping = await this._client.indices.getMapping({ index: this._index, type: this._type });

    return this._isUpgradeable(dashboardMapping[this._index].mappings);
  }

  async upgrade() {
    const dashboardMapping = await this._client.indices.getMapping({ index: this._index, type: this._type });
    const mapping = dashboardMapping[this._index].mappings;

    if(this._isUpgradeable(mapping) !== 0) {
      mapping.dashboard.properties.refreshInterval = await this.getDefaultRefreshIntervalMapping();

      await this._client.indices.putMapping({
        index: this._index,
        type: this._type,
        body: mapping
      });
    }

    return 1;
  }
}