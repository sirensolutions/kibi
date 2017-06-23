import { transform, cloneDeep } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 11.
 *
 * Looks for Kibi Heatmap visualizations created in 4.x and port them to 5.x
 */

export default class Migration11 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.index;
    this._logger = configuration.logger;
    this._type = 'visualization';
  }

  static get description() {
    return 'Migrate Kibi Heatmap visualizations to 5.x.';
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
   * Checks if the specified visState describes a heatmap visualization from 4.x
   * @param visState
   * @private
   */
  _isUpgradeable(visState) {
    return visState.type === 'heatmap' && visState.params.margin;
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
          switch (key) {
            case 'params':
              result[key] = {
                addTooltip: true,
                addLegend: true,
                enableHover: false,
                legendPosition: 'right',
                times: [],
                colorsNumber: value.numberOfColors,
                colorSchema: 'Greens',
                setColorRange: false,
                colorsRange: [],
                invertColors: false,
                percentageMode: false,
                valueAxes: [
                  {
                    show: false,
                    id: 'ValueAxis-1',
                    type: 'value',
                    scale: {
                      type: 'linear',
                      defaultYExtents: false
                    },
                    labels: {
                      show: false,
                      rotate: 0,
                      color: '#555'
                    }
                  }
                ]
              };
              break;
            case 'aggs':
              result.aggs = visState.aggs.map(agg => {
                const upgraded = cloneDeep(agg);
                upgraded.enabled = true;
                if (upgraded.schema === 'columns') {
                  upgraded.schema = 'segment';
                } else if (upgraded.schema === 'rows') {
                  upgraded.schema = 'group';
                }
                return upgraded;
              });
              break;
            default:
              result[key] = value;
          }
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
        body
      });
    }
    return count;
  }

}
