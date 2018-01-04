import { transform } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Investigate Core - Migration 16.
 *
 * Looks for visualisation with _source.visState.type == 'kibi_scatterplot_vis'
 *
 * - change the value to 'scatterplot_vis'
 */

export default class Migration16 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._logger = configuration.logger;
    this._type = 'visualization';
  }

  static get description() {
    return 'Upgrade Scatter Plot visualisation type from kibi_scatterplot_vis to scatterplot_vis';
  }

  _isUpgradeable(visState) {
    return visState.type === 'kibi_scatterplot_vis';

  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type);
    return objects.reduce((count, obj) => {
      const visState = JSON.parse(obj._source.visState);
      if (this._isUpgradeable(visState)) {
        return count + 1;
      }
      return count;
    }, 0);
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let count = 0;
    for (const obj of objects) {
      const visState = JSON.parse(obj._source.visState);
      if (this._isUpgradeable(visState)) {
        const newVisState = transform(visState, (result, value, key) => {
          if (key === 'type') {
            result[key] = 'scatterplot_vis';
            return;
          }
        });
        obj._source.visState = JSON.stringify(newVisState);
        body += JSON.stringify({
          update: {
            _index: obj._index,
            _type: obj._type,
            _id: obj._id
          }
        }) + '\n' + JSON.stringify({ doc: obj._source }) + '\n';
        count++;
      }
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

