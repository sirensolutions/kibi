import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 17.
 *
 * Looks for:
 *
 * - configuration objects with the id 'kibi'
 *
 * Then:
 *
 * - changes that id to 'siren'
 * - deletes the old 'kibi' object
 * - and PUTs the new 'siren' object
 *  (effectively overwriting the old 'kibi' object)
 */
export default class Migration17 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
  }

  static get description() {
    return 'Migrate config object id from "kibi" to "siren"';
  }

  async _getConfigurations() {
    const configurations = await this._client.search({
      index: this._index,
      type: 'config',
      size: 1000
    });
    return configurations.hits.hits;
  }

  async count() {
    const existingConfigs = await this._client.count({
      index: this._index,
      type: 'config',
      ignoreUnavailable: true
    });
    if (existingConfigs.count === 0) {
      return 0;
    }
    try {
      await this._client.get({
        index: this._index,
        type: 'config',
        id: 'siren'
      });
    } catch (err) {
      if (err.status === 404) {
        const configs = await this._getConfigurations();
        return configs.length;
      } else {
        throw err;
      }
    }
    return 0;
  }

  async upgrade() {
    const count = await this.count();
    if (count === 0) {
      return 0;
    }
    const configurations = await this._getConfigurations();
    let configuration;
    let body = '';
    for (const config of configurations) {
      body += JSON.stringify({
        delete: {
          _index: config._index,
          _type: config._type,
          _id: "kibi"
        }
      }) + '\n' +
      JSON.stringify({
        index: {
          _index: config._index,
          _type: config._type,
          _id: 'siren'
        }
      }) + '\n' +
      JSON.stringify(config._source) + '\n';
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
