import Migration from 'kibiutils/lib/migrations/migration';
import _ from 'lodash';

/**
 * Investigate Core - Migration 24.
 *
 * Looks for:
 *
 * - the sourceFilters object within the kibana.index index-pattern mapping
 *
 * Then:
 *
 * - if not found, adds the sourceFilters mapping object
 */
export default class Migration23 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._type = 'index-pattern';
    this._defaultSourceFiltersMapping = {
      properties: {
        sourceFilters: {
          type:'text'
        }
      }
    };
  }

  static get description() {
    return 'Add the sourceFilters mapping type to the mappings if it doesn\'t exist';
  }

 /**
   * Checks if index-pattern mapping contains a property called "sourceFilters".
   */
  _isUpgradeable(mappings) {
    const indexPatternMappingsProperties = mappings['index-pattern'].properties;
    return (indexPatternMappingsProperties.sourceFilters) ? 0 : 1;
  }

  /**
   * Exposes the default sourceFilters mapping object
   */
  getDefaultSourceFiltersMapping() {
    return this._defaultSourceFiltersMapping;
  }

  async count() {
    try {
      const indexPatternMapping = await this._client.indices.getMapping({
        index: this._index,
        type: this._type,
        ignoreUnavailable: true,
        allowNoIndices: true
      });
      return this._isUpgradeable(indexPatternMapping[this._index].mappings);
    } catch (e) {
      if (e.status === 404) {
        return 0;
      }
      throw e;
    }
  }

  async upgrade() {
    const indexPatternMapping = await this._client.indices.getMapping({ index: this._index, type: this._type });
    const mapping = indexPatternMapping[this._index].mappings;

    if(this._isUpgradeable(mapping) !== 0) {
      mapping['index-pattern'].properties.sourceFilters = this.getDefaultSourceFiltersMapping();

      await this._client.indices.putMapping({
        index: this._index,
        type: this._type,
        body: mapping
      });
    }

    return 1;
  }
}
