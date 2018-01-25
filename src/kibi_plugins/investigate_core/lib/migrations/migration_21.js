import Migration from 'kibiutils/lib/migrations/migration';
import _ from 'lodash';

/**
 * Investigate Core - Migration 20.
 *
 * Looks for:
 *
 * - the siren:relations advanced setting inside siren (singleton) config
 *
 * Then:
 *
 * - removes unsupported type field from relations.
 */
export default class Migration21 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._type = 'config';
    this._query = {
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: 'siren'
              }
            },
            {
              exists: {
                field: 'siren:relations'
              }
            }
          ]
        }
      }
    };

    this._supportedOptions = new Set();
    this._supportedOptions.add('BROADCAST_JOIN');
    this._supportedOptions.add('HASH_JOIN');
    this._supportedOptions.add('MERGE_JOIN');
  }

  static get description() {
    return 'Remove type field in relations if with an unsupported value';
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    if (objects.length !== 1) {
      this._logger.error('There should be only one config object');
      return 0;
    }
    if (!objects[0]._source['siren:relations']) {
      return 0;
    }

    const relations = JSON.parse(objects[0]._source['siren:relations']);
    if (this._isUpgradeable(relations)) {
      return 1;
    }

    return 0;
  }

  async upgrade() {
    let count = 0;
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return count;
    }
    if (objects.length !== 1) {
      this._logger.error('There should be only one config object');
      return count;
    }
    const obj = objects[0];
    if (!obj._source['siren:relations']) {
      return count;
    }

    const relations = JSON.parse(obj._source['siren:relations']);
    this._upgradeSirenRelations(relations);

    this._logger.info(`Updating siren:relations from config with _id=${obj._id}`);

    let body = '';
    body += JSON.stringify({
      update: {
        _index: obj._index,
        _type: obj._type,
        _id: obj._id
      }
    }) + '\n' +
    JSON.stringify({ doc: {
      'siren:relations': JSON.stringify(relations)
    } }) + '\n';

    if (body !== '') {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }

    return 1;
  }

  /**
   * Checks if the siren:relations is upgradeable.
   */
  _isUpgradeable(relations) {
    let check = false;
    if (relations && relations.relationsIndices && relations.relationsIndices.length) {
      _.each(relations.relationsIndices, (rel) => {
        if (rel.type && !this._supportedOptions.has(rel.type)) {
          check = true;
        }
      });
    }
    return check;
  }

  /**
   * Upgrades the siren:relations
   *
   * @param {Object} relations the siren:relations object to update.
   */
  _upgradeSirenRelations(relations) {
    _.each(relations.relationsIndices, (rel) => {
      if (rel.type && !this._supportedOptions.has(rel.type)) {
        delete rel.type;
      }
    });
  }

}
