import Migration from 'kibiutils/lib/migrations/migration';
import _ from 'lodash';

/**
 * Investigate Core - Migration 19.
 *
 * Looks for:
 *
 * - the siren:relations advanced setting inside siren (singleton) config
 * - visualizations of type kibi_sequential_join_vis
 *
 * Then:
 *
 * - converts the old relation ids to UUIDs.
 * - updates every join button replacing its relation id with the new one.
 */
export default class Migration8 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.config.get('kibana.index');
    this._configType = 'config';
    this._configQuery = {
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
    this._visualizationType = 'visualization';
    this._visualizationQuery = {
      size: 500,
      query: {
        match_all: {}
      }
    };
  }

  static get description() {
    return 'Upgrade relation ids in siren (singleton) config and sequential join visualizations';
  }

  async count() {
    const objects = await this.scrollSearch(this._index, this._configType, this._configQuery);
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
      const visualizations = await this.scrollSearch(this._index, this._visualizationType, this._visualizationQuery);
      if (visualizations.length === 0) {
        return 1;
      }
      const joinVisualizations = this._getJoinVisualizations(visualizations);
      return 1 + joinVisualizations.length;
    }

    return 0;
  }

  async upgrade() {
    let count = 0;
    const objects = await this.scrollSearch(this._index, this._configType, this._configQuery);
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
    const idsMap = this._upgradeSirenRelations(relations);

    if (idsMap === {}) {
      return count;
    }

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
    count++;

    const visualizations = await this.scrollSearch(this._index, this._visualizationType, this._visualizationQuery);
    if (visualizations.length === 0) {
      return count;
    }

    const joinVisualizations = this._getJoinVisualizations(visualizations);
    const updatedVisualizations = this._getUpdatedJoinVisualizations(joinVisualizations, idsMap);

    _.each(updatedVisualizations, (vis) => {
      body += JSON.stringify({
        update: {
          _index: vis._index,
          _type: vis._type,
          _id: vis._id
        }
      }) + '\n' +
      JSON.stringify({ doc: vis._source }) + '\n';
      count++;
    });

    if (count > 1) {
      await this._client.bulk({
        refresh: true,
        body: body
      });
    }

    return count;
  }

  /**
   * Checks if the siren:relations is upgradeable.
   */
  _isUpgradeable(relations) {
    if (relations && relations.relationsIndices && relations.relationsIndices.length) {
      if (relations.relationsIndices[0].id.split('/').length === 6) {
        return true;
      }
    }
    return false;
  }

  /**
   * Return only the visualizations that are of type kibi_sequential_join_vis.
   */
  _getJoinVisualizations(visualizations) {
    return _.filter(visualizations, (vis) => {
      if (vis._source && vis._source.visState) {
        const state = JSON.parse(vis._source.visState);
        if (state.type === 'kibi_sequential_join_vis') {
          return true;
        }
      }
      return false;
    });
  }

  /**
   *  Updates every relation id to the new UUID.
   */
  _getUpdatedJoinVisualizations(visualizations, idsMap) {
    _.each(visualizations, (vis) => {
      const visState = JSON.parse(vis._source.visState);
      _.each(visState.params.buttons, (button) => {
        button.indexRelationId = idsMap[button.indexRelationId];
      });
      vis._source.visState = JSON.stringify(visState);
    });
    return visualizations;
  }

  /**
   * Produses an UUID with the same JAVA pattern.
   */
  _getUUID() {
    const _pattern = function (t, s) {
      const p = ((t ? (Date.now()) : (Math.random())).toString(16) + '0000000').substr(2, 8);
      return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p;
    };
    return _pattern(true) + _pattern(false, true) + _pattern(false, true) + _pattern();
  }

  /**
   * Upgrades the siren:relations
   *
   * @param {Object} relations the siren:relations object to update.
   * @retval {Boolean} true if the relations has been modified.
   * @retval {Boolean} false if the relations has not been modified.
   */
  _upgradeSirenRelations(relations) {
    const idsMap = {};
    relations.relationsIndices.forEach(relation => {
      const uuid = this._getUUID();
      idsMap[relation.id] = uuid;
      relation.id = uuid;
    });
    return idsMap;
  }

}
