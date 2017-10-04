import requirefrom from 'requirefrom';
import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 13.
 *
 * Looks for:
 *
 * - the "exclude" and "include" property in visualizations
 *
 * Then:
 *
 * - remove "exclude" and "include" because they are deprecated
 */
export default class Migration14 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._config =  configuration.config;
    this._index = configuration.config.get('kibana.index');
    this._type = 'visualization';
    this._query = {
      'query': {
        'query_string' : {
          'query' : 'exclude OR include'
        }
      }
    };
  }

  static get description() {
    return 'Remove deprecated "exclude" and "include" properties from visualizations';
  }

  async _fetchVisualizations() {
    this._visualizations = [];
    const visualizations = await this.scrollSearch(this._index, this._type, this._query);
    _.each(visualizations, visualization => {
      const sourceObject = JSON.parse(visualization._source.kibanaSavedObjectMeta.searchSourceJSON);
      if(sourceObject.source) {
        if (sourceObject.source.include || sourceObject.source.exclude) {
          this._visualizations.push(visualization);
        }
      }
    });
  }

  async count() {
    await this._fetchVisualizations();
    if (this._visualizations) {
      return this._visualizations.length;
    }
    return 0;
  }

  async upgrade() {
    let upgraded = 0;
    await this._fetchVisualizations();
    if (this._visualizations.length === 0) {
      return upgraded;
    }

    let body = '';
    this._logger.info(`Removing deprecated "exclude" and "include" properties from visualizations`);

    _.each(this._visualizations, visualization => {
      const sourceObject = JSON.parse(visualization._source.kibanaSavedObjectMeta.searchSourceJSON);
      if (sourceObject.source) {
        const exclude = sourceObject.source.exclude;
        const include = sourceObject.source.include;
        let upgradedSourceObjectSource;

        if (include) {
          const message = '[ include ] property in visualization is deprecated, removing from visualization';
          this._logger.warning(message);
          upgradedSourceObjectSource = _.omit(sourceObject.source,'include');
        }
        if (exclude) {
          const message = '[ exclude ] property in visualization is deprecated, removing from visualization';
          this._logger.warning(message);
          upgradedSourceObjectSource = _.omit(sourceObject.source,'exclude');
        }

        sourceObject.source = upgradedSourceObjectSource;
        const sourceObjectString = JSON.stringify(sourceObject);

        body += JSON.stringify({
          update: {
            _index: visualization._index,
            _type: visualization._type,
            _id: visualization._id
          }
        })  + '\n' + JSON.stringify({
          doc: {
            kibanaSavedObjectMeta: {
              searchSourceJSON: sourceObjectString
            }
          }
        }) + '\n';
        upgraded++;
      }
    });

    if (upgraded > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return upgraded;
  }
}
