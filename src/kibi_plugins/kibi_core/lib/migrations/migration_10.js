import { transform, cloneDeep } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 10.
 *
 * Looks for Kibi Word Cloud visualizations and upgrades them to Kibana 5 Tagcloud visualizations.
 */

export default class Migration10 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.index;
    this._logger = configuration.logger;
    this._type = 'visualization';
  }

  static get description() {
    return 'Migrate Kibi Word Cloud visualizations to Tag Cloud visualizations.';
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

  /**
   * Checks if the specified visState described a Kibi Word Cloud
   * @param visState
   * @private
   */
  _isUpgradeable(visState) {
    return visState.type === 'kibi_wordcloud';

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
          if (key === 'params') {
            const upgradedParams = {
              scale: 'linear',
              orientation: 'single',
              minFontSize: 18,
              maxFontSize: 72
            };
            result[key] = upgradedParams;
            return;
          } else if (key === 'type') {
            result[key] = 'tagcloud';
            return;
          } else if (key === 'aggs') {
            result.aggs = visState.aggs.map(agg => {
              const upgraded = cloneDeep(agg);
              upgraded.enabled = true;
              if (upgraded.schema === 'bucket') {
                upgraded.schema = 'segment';
              }
              return upgraded;
            });
            return;
          }
          result[key] = value;
        });
        obj._source.uiStateJSON = '{}';
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
