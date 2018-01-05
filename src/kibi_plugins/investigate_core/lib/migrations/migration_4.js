import Migration from 'kibiutils/lib/migrations/migration';
import { pkg } from '../../../../utils/package_json';

/**
 * Kibi Core - Migration 4.
 *
 * Looks for:
 *
 * - the kibi:relations advanced setting
 *
 * Then:
 *
 * - adds missing slashes separator in relations IDs since the index pattern type is now added
 * - the data object from relationsDashboardsSerialized is now the relation object between dashboards
 */
export default class Migration4 extends Migration {

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
                _id: pkg.kibi_version
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
    return 'Upgrade relations between dashboards and indices';
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    return objects.reduce((count, obj) => {
      if (!obj._source['kibi:relations']) {
        return count;
      }
      const relations = JSON.parse(obj._source['kibi:relations']);
      if (this._isUpgradeable(relations)) {
        return count + 1;
      }
      return count;
    }, 0);
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type, this._query);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let upgraded = 0;
    for (const obj of objects) {
      if (!obj._source['kibi:relations']) {
        continue;
      }
      const relations = JSON.parse(obj._source['kibi:relations']);
      const modified = this._upgradeKibiRelations(relations);

      if (!modified) {
        continue;
      }

      this._logger.info(`Updating kibi:relations from config with _id=${obj._id}`);
      body += JSON.stringify({
        update: {
          _index: obj._index,
          _type: obj._type,
          _id: obj._id
        }
      }) + '\n' + JSON.stringify({
        doc: {
          'kibi:relations': JSON.stringify(relations)
        }
      }) + '\n';
      upgraded++;
    }

    if (upgraded > 0) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return upgraded;
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
