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
    this._type = 'config';
    this._query = {
      size: 1000,
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: 'kibi'
              }
            }
          ]
        }
      }
    };
  }

  static get description() {
    return 'Migrate config object id from "kibi" to "siren"';
  }

  async count() {
    const configs = await this.scrollSearch(this._index, this._type, this._query);
    return configs.length;
  }

  async upgrade() {
    const configurations = await this.scrollSearch(this._index, this._type, this._query);
    if (configurations.length === 0) {
      return 0;
    }

    let body = '';
    for (const config of configurations) {
      body += JSON.stringify({
        index: {
          _index: config._index,
          _type: config._type,
          _id: 'siren'
        }
      }) + '\n' +
      JSON.stringify(config._source) + '\n';
    }

    if (body.length) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return configurations.length;
  }
}
