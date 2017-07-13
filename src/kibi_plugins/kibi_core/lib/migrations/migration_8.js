import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 8.
 *
 * Looks for:
 *
 * - the kibi:relations advanced setting inside kibi (singleton) config
 *
 * Then:
 *
 * - adds missing slashes separator in relations IDs since the index pattern type is now added
 * - the data object from relationsDashboardsSerialized is now the relation object between dashboards
 */
export default class Migration8 extends Migration {

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
                _id: 'kibi'
              }
            },
            {
              exists: {
                field: 'kibi:relations'
              }
            }
          ]
        }
      }
    };
  }

  static get description() {
    return 'Upgrade relations between dashboards and indices in kibi (singleton) config';
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
    if (!objects[0]._source['kibi:relations']) {
      return 0;
    }

    const relations = JSON.parse(objects[0]._source['kibi:relations']);
    if (this._isUpgradeable(relations)) {
      return 1;
    }

    return 0;
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    if (objects.length !== 1) {
      this._logger.error('There should be only one config object');
      return 0;
    }
    if (!objects[0]._source['kibi:relations']) {
      return 0;
    }
    const obj = objects[0];
    const relations = JSON.parse(obj._source['kibi:relations']);
    const modified = this._upgradeKibiRelations(relations);

    if (!modified) {
      return 0;
    }

    this._logger.info(`Updating kibi:relations from config with _id=${obj._id}`);

    await this._client.update({
      index: obj._index,
      type: obj._type,
      id: obj._id,
      refresh: 'wait_for',
      body: {
        doc: {
          'kibi:relations': JSON.stringify(relations)
        }
      }
    });
    return 1;
  }

  /**
   * Checks if the kibi:relations is upgradeable.
   */
  _isUpgradeable(relations) {
    if (!relations.version) {
      return true;
    }
  }

  /**
   * _addIndexPatternType adds an empty index pattern type, and prints a warning if there was already such a field
   *
   * @param index an object with two fields, indexPatternId and path
   */
  _addIndexPatternType(index) {
    if (index.indexPatternType) {
      this._logger.warning(`The index ${JSON.stringify(index, null, ' ')} already has an indexPatternType field`);
    } else {
      index.indexPatternType = '';
    }
  }

  /**
   * _updateRelationId adds missing slash separators in the relation ID since the index type is now added
   *
   * @param relation an object that contains the relation ID
   * @param field the field name which value is the relation ID
   */
  _updateRelationId(relation, field) {
    const parts = relation[field].split('/');
    if (parts.length !== 4) {
      this._logger.warning(`The relation id ${relation[field]} is expected to have 4 parts separated by '/'`);
    } else {
      relation[field] = `${parts[0]}//${parts[1]}/${parts[2]}//${parts[3]}`;
    }
  }

  /**
   * Upgrades the kibi:relations
   *
   * @param {Object} relations the kibi:relations object to update.
   * @retval {Boolean} true if the relations has been modified.
   * @retval {Boolean} false if the relations has not been modified.
   */
  _upgradeKibiRelations(relations) {
    let modified = false;

    if (!relations.version) {
      relations.relationsIndices.forEach(relation => {
        this._updateRelationId(relation, 'id');
        this._addIndexPatternType(relation.indices[0]);
        this._addIndexPatternType(relation.indices[1]);
      });
      relations.relationsDashboards.forEach(relation => {
        this._updateRelationId(relation, 'relation');
      });
      if (relations.relationsDashboardsSerialized) {
        relations.relationsDashboardsSerialized.links.forEach(link => {
          if (link.data.id) {
            this._updateRelationId(link.data, 'id');
            link.data = {
              relation: link.data.id,
              dashboards: [
                link.source.replace('eegid-', ''),
                link.target.replace('eegid-', '')
              ]
            };
          }
        });
      }
      relations.version = 2;
      modified = true;
    }
    return modified;
  }

}
