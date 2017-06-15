import _ from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 9.
 *
 * Looks for:
 *
 * - old gremlin queries
 *
 * Then:
 *
 * - remove them as they are not needed anymore.
 */
export default class Migration9 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.index;
    this._type = 'query';
  }

  static get description() {
    return 'Delete gremlin server saved queries.';
  }

  async count() {
    const items = await this.scrollSearch(this._index, [ 'query', 'datasource' ]);
    const tinkerpop3Datasources = items.reduce((array, obj) => {
      if (obj._type === 'datasource') {
        const datasourceType = obj._source.datasourceType;
        if (datasourceType === 'tinkerpop3') {
          array.push(obj._id);
        }
      }
      return array;
    }, []);

    return items.reduce((count, obj) => {
      if (obj._type === 'query') {
        const datasourceId = obj._source.datasourceId;
        if (_.includes(tinkerpop3Datasources, datasourceId)) {
          count++;
        }
      }
      return count;
    }, 0);
  }

  async upgrade() {
    const items = await this.scrollSearch(this._index, [ 'query', 'datasource' ]);
    const tinkerpop3Datasources = items.reduce((array, obj) => {
      if (obj._type === 'datasource') {
        const datasourceType = obj._source.datasourceType;
        if (datasourceType === 'tinkerpop3') {
          array.push(obj._id);
        }
      }
      return array;
    }, []);

    const tinkerPopQueryIds = items.reduce((array, obj) => {
      if (obj._type === 'query') {
        const datasourceId = obj._source.datasourceId;
        if (_.includes(tinkerpop3Datasources, datasourceId)) {
          array.push(obj._id);
        }
      }
      return array;
    }, []);

    const bulkRequests = tinkerPopQueryIds.reduce((array, id) => {
      array.push({
        delete: {
          _index: this._index,
          _type: this._type,
          _id: id
        }
      });
      return array;
    }, []);

    await this._client.bulk({
      refresh: true,
      body: bulkRequests
    });

    return bulkRequests.length;
  }

}
