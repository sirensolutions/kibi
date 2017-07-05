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
export default class Migration7 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
  }

  static get description() {
    return 'Move configuration object to singleton';
  }

  async _getConfigurations() {
    const configurations = await this._client.search({
      index: this._index,
      type: 'config',
      size: 1000
    });
    return configurations.hits.hits.sort((confa, confb) => {
      const buildNumA = parseInt(confa._source.buildNum) || 0;
      const buildNumB = parseInt(confb._source.buildNum) || 0;
      return buildNumA < buildNumB;
    });
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
        const configurations = await this._getConfigurations();
        let onlySnapshots = true;
        for (const config of configurations) {
          if (!config._id.endsWith('-SNAPSHOT')) {
            onlySnapshots = false;
            break;
          }
        }
        return onlySnapshots ? 0 : 1;
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
    const configurations = await this._getConfigurations();
    let configuration;
    for (const config of configurations) {
      if (!config._id.endsWith('-SNAPSHOT')) {
        configuration = config._source;
        break;
      }
    }
    delete configuration.buildNum;
    await this._client.create({
      refresh: true,
      index: this._index,
      type: 'config',
      id: 'kibi',
      body: configuration
    });
    return 1;
  }

}
