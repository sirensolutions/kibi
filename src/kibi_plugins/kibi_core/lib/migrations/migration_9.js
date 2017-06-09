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

  async getTinkerpopDatasourcesIds() {
    const datasources = await this.scrollSearch(this._index, 'datasource');
    const datasourceIds = datasources.reduce((array, obj) => {
      const datasourceType = obj._source.datasourceType;
      if (datasourceType === 'tinkerpop3') {
        array.push(obj._id);
      }
      return array;
    }, []);
    return datasourceIds;
  }

  async count() {
    const queries = await this.scrollSearch(this._index, this._type);
    const tinkerpop3Datasources = await this.getTinkerpopDatasourcesIds();

    return queries.reduce((count, obj) => {
      const datasourceId = obj._source.datasourceId;
      if (_.includes(tinkerpop3Datasources, datasourceId)) {
        count++;
      }
      return count;
    }, 0);
  }

  async upgrade() {
    const queries = await this.scrollSearch(this._index, this._type);
    const tinkerpop3Datasources = await this.getTinkerpopDatasourcesIds();

    const tinkerPopQueryIds = queries.reduce((array, obj) => {
      const datasourceId = obj._source.datasourceId;
      if (_.includes(tinkerpop3Datasources, datasourceId)) {
        array.push(obj._id);
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

    let count = 0;
    await this._client.bulk({
      body: bulkRequests
    }, (error, resp) => {
      if (!error && resp && !resp.errors) {
        count = resp.items.length;
      }
    });

    await this._client.indices.refresh();
    return count;
  }

}
