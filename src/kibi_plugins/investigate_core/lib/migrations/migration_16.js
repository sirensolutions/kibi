import { transform, cloneDeep } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 16.
 *
 * Looks for datasource with _id == Kibi-Gremlin-Server
 * if found
 * - delete the origional one
 * - index a copy with _id == Siren-Gremlin-Server
 */
export default class Migration16 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._logger = configuration.logger;
    this._type = 'datasource';
  }

  static get description() {
    return 'Migrate Kibi-Gremlin-Server into Siren-Gremlin-Server';
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type);
    return objects.reduce((count, obj) => {
      if (this._isUpgradeable(obj._id)) {
        return count + 1;
      }
      return count;
    }, 0);
  }

  _isUpgradeable(id) {
    return id === 'Kibi-Gremlin-Server';
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let count = 0;
    for (const obj of objects) {

      if (this._isUpgradeable(obj._id)) {

        obj._source.title = 'Siren-Gremlin-Server';

        body += JSON.stringify({
          delete: {
            _index: obj._index,
            _type: obj._type,
            _id: obj._id
          }
        }) + '\n' +
        JSON.stringify({
          index: {
            _index: obj._index,
            _type: obj._type,
            _id: 'Siren-Gremlin-Server'
          }
        }) + '\n' +
        JSON.stringify(obj._source) + '\n';
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
