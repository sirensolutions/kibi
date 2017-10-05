import requirefrom from 'requirefrom';
import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 13.
 *
 * Looks for:
 *
 * - the "discover:sampleSize" property in config
 * - the "pageSize" property in "visState" property of visualizations
 *
 * Then:
 *
 * - if "discover:sampleSize" or "visState" is a string parse it to number
 */
export default class Migration15 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._config =  configuration.config;
    this._index = configuration.config.get('kibana.index');
    this._configQuery = {
      'query': {
        'exists' : { 'field' : 'discover:sampleSize' }
      }
    };
    this._visQuery = {
      'query': {
        'exists' : { 'field' : 'visState' }
      }
    };
  }

  static get description() {
    return 'Check "discover:sampleSize" property in config and "pageSize" property in "visState" property of visualizations ' +
    'if any of them a string, parse to number';
  }

  async _fetchConfigs() {
    this._configs = [];
    const configs = await this.scrollSearch(this._index, 'config', this._configQuery);
    _.each(configs, config => {
      if (_.isString(config._source['discover:sampleSize'])) {
        this._configs.push(config);
      }
    });
  }

  async _fetchVisualizations() {
    this._visualizations = [];
    const visualizations = await this.scrollSearch(this._index, 'visualization', this._visQuery);
    _.each(visualizations, visualization => {
      const visState = JSON.parse(visualization._source.visState);
      if (_.get(visState.params, 'pageSize') && _.isString(_.get(visState.params, 'pageSize'))) {
        this._visualizations.push(visualization);
      }
    });
  }

  async count() {
    await this._fetchConfigs();
    await this._fetchVisualizations();
    if (this._configs || this._visualizations) {
      return this._visualizations.length + this._configs.length;
    }
    return 0;
  }

  async upgrade() {
    let upgraded = 0;
    await this._fetchConfigs();
    await this._fetchVisualizations();
    if (this._visualizations.length === 0 && this._configs.length === 0) {
      return upgraded;
    }

    let body = '';
    this._logger.info('Checking "discover:sampleSize" property in config and ' +
    '"pageSize" property in "visState" property of visualizations');

    _.each(this._configs, config => {
      if (_.get(config._source, 'discover:sampleSize')) {
        const sampleSize = _.get(config._source, 'discover:sampleSize');
        if (_.isString(sampleSize)) {
          const sampleSizeInt =  parseInt(sampleSize);

          this._logger.info('Parsing "discover:sampleSize" property in [ ' + config._id + ' ] to number');
          body += JSON.stringify({
            update: {
              _index: config._index,
              _type: config._type,
              _id: config._id
            }
          })  + '\n' + JSON.stringify({
            doc: {
              'discover:sampleSize': sampleSizeInt
            }
          }) + '\n';
          upgraded++;
        }
      }
    });

    _.each(this._visualizations, visualization => {
      const visState = JSON.parse(visualization._source.visState);
      if (_.get(visState.params, 'pageSize') && _.isString(visState.params.pageSize)) {
        const pageSizeInt = parseInt(visState.params.pageSize);
        visState.params.pageSize = pageSizeInt;
        visualization._source.visState = visState;
        const visStateObjectString = JSON.stringify(visualization._source.visState);

        this._logger.info('Parsing "pageSize" property in [ ' + visualization._id + ' ] to number');
        body += JSON.stringify({
          update: {
            _index: visualization._index,
            _type: visualization._type,
            _id: visualization._id
          }
        })  + '\n' + JSON.stringify({
          doc: {
            visState: visStateObjectString
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
