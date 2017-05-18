import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 7.
 *
 * Looks for:
 *
 * - configuration objects
 *
 * Then:
 *
 * - migrate latest configuration to the new config object singleton
 */
export default class Migration6 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.index;
  }

  static get description() {
    return 'Move configuration object to singleton';
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
        id: 'kibi'
      });
    } catch (err) {
      if (err.status === 404) {
        return 1;
      }
      throw err;
    }
    return 0;
  }

  async upgrade() {
    const count = await this.count();
    if (count === 0) {
      return 0;
    }
    const configurations = await this._client.search({
      index: this._index,
      type: 'config',
      size: 1,
      body: {
        sort: {
          _script: {
            type: 'number',
            script: {
              lang: 'painless',
              // buildNum is indexed as a string
              inline: 'Integer.parseInt(doc.buildNum.value)'
            },
            order: 'desc'
          }
        }
      }
    });
    const configuration = configurations.hits.hits[0]._source;
    delete configuration.buildNum;
    await this._client.create({
      index: this._index,
      type: 'config',
      id: 'kibi',
      body: configuration
    });
    return 1;
  }

}
