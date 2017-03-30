import _ from 'lodash';
import requirefrom from 'requirefrom';
const pkg = requirefrom('src/utils')('package_json');
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 5.
 *
 * Looks for:
 *
 * - kibi relational filter visualizations
 *
 * Then:
 *
 * - set the version to 2
 * - creates the new field indexRelationId as a combination from previous fields of the visualization. The index relation is taken
 *   from the kibi:relations object.
 */
export default class Migration5 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._logger = configuration.logger;
    this._client = configuration.client;
    this._index = configuration.index;
  }

  static get description() {
    return 'Upgrade kibi relational filter visualizations';
  }

  async count() {
    const objects = await this.scrollSearch(this._index, 'visualization');
    return objects.reduce((count, obj) => {
      if (obj._type === 'visualization') {
        const visState = JSON.parse(obj._source.visState);
        if (this._isUpgradeable(visState)) {
          return count + 1;
        }
      }
      return count;
    }, 0);
  }

  _bulkIndex(index, type, id, doc) {
    return JSON.stringify({
      update: {
        _index: index,
        _type: type,
        _id: id
      }
    }) + '\n' +
      JSON.stringify({ doc }) + '\n';
  }

  async upgrade() {
    const objects = await this.scrollSearch(this._index, 'config,visualization');
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let upgraded = 0;

    const config = _(objects)
    .remove('_type', 'config')
    .find('_id', pkg.kibi_version);

    let relations = { relationsIndices: [], relationsDashboards: [] };
    if (config._source['kibi:relations']) {
      relations = JSON.parse(config._source['kibi:relations']);
    }

    for (const obj of objects) {
      const visState = JSON.parse(obj._source.visState);
      const modified = await this._upgradeVisualization(relations, visState);

      if (!modified) {
        continue;
      }

      this._logger.info(`Updating the "kibi relational filter" visualization with _id=${obj._id} to version 2`);
      body += this._bulkIndex(obj._index, 'visualization', obj._id, { visState: JSON.stringify(visState) });
      upgraded++;
    }

    if (upgraded > 0) {
      // if the kibi:relations changed
      body += this._bulkIndex(this._index, 'config', pkg.kibi_version, { 'kibi:relations': JSON.stringify(relations) });

      await this._client.bulk({
        refresh: true,
        body: body
      });
    }
    return upgraded;
  }

  /**
   * Checks if the kibi relational filter visualization is upgradeable.
   */
  _isUpgradeable(visState) {
    return !visState.version && visState.type === 'kibi_sequential_join_vis';
  }

  /**
   * _getRelationId returns the relation ID based on the configration of the relational filter visualization (version 1).
   *
   * @param button a configuration of the filter in version 1
   * @returns an identifier of the indices relation
   */
  _getRelationId(button) {
    const clean = function (str) {
      return str.replace(/\//, '-slash-');
    };

    const ia = `${clean(button.sourceIndexPatternId)}/${clean(button.sourceIndexPatternType || '')}/${clean(button.sourceField)}`;
    const ib = `${clean(button.targetIndexPatternId)}/${clean(button.targetIndexPatternType || '')}/${clean(button.targetField)}`;
    return ia < ib ? ia + '/' + ib : ib + '/' + ia;
  }

  _upgradeButton(button, relationId) {
    button.indexRelationId = relationId;
    button.targetDashboardId = button.redirectToDashboard;
    button.sourceDashboardId = '';
    delete button.redirectToDashboard;
    delete button.sourceIndexPatternId;
    delete button.sourceIndexPatternType;
    delete button.sourceField;
    delete button.targetIndexPatternId;
    delete button.targetIndexPatternType;
    delete button.targetField;
  }

  _createIndicesRelation(relations, button, relationId) {
    const relation = {
      id: relationId,
      indices: [
        {
          indexPatternId: button.sourceIndexPatternId,
          indexPatternType: button.sourceIndexPatternType,
          path: button.sourceField
        },
        {
          indexPatternId: button.targetIndexPatternId,
          indexPatternType: button.targetIndexPatternType,
          path: button.targetField
        }
      ],
      label: `${button.sourceIndexPatternId}.${button.sourceIndexPatternType}.${button.sourceField} -- ` +
        `${button.targetIndexPatternId}.${button.targetIndexPatternType}.${button.targetField}`
    };
    relations.relationsIndices.push(relation);
  }

  /**
   * _getTypes returns the list of types that appear for the given indices
   *
   * @param indices an array of index patterns
   * @returns an array with the type names, minus the default one
   */
  async _getTypes(indices) {
    const mapping = await this._client.indices.getMapping({
      index: indices,
      ignoreUnavailable: true,
      allowNoIndices: true
    });
    return _(mapping)
    .map(value => _.keys(value.mappings))
    .flatten()
    .unique()
    .without('_default_')
    .value();
  }

  /**
  * Upgrades the kibi relational filter visualization
  *
  * @param {Object} relations the kibi:relations object
  * @param {Object} visState the visState object of the visualization to upgrade
  * @retval {Boolean} true if the visualization and/or relations have been modified.
  * @retval {Boolean} false if the visualization and/or relations have not been modified.
  */
  async _upgradeVisualization(relations, visState) {
    let modified = false;

    if (this._isUpgradeable(visState)) {
      for (const button of visState.params.buttons) {
        const relationId = this._getRelationId(button);

        // although types is used only in the else block, this is put here so that a warning
        // about missing indices can be shown
        const types = await this._getTypes([ button.sourceIndexPatternId, button.targetIndexPatternId ]);
        if (types.length < 2) {
          this._logger.warning(`No concrete index matches the patterns ${button.sourceIndexPatternId} and ${button.targetIndexPatternId}`);
        }

        if (_.find(relations.relationsIndices, 'id', relationId)) {
          this._upgradeButton(button, relationId);
        } else {
          this._logger.info(`No relation for the button "${button.label}" was found`);

          if (types.length > 2) {
            this._logger.info(`The ${button.sourceIndexPatternId} and/or ${button.targetIndexPatternId} have more than one type. A new ` +
                              `relation with ID=${relationId} based on the configuration of the "${button.label}" button will be created.`);
            // since there are mulitple types per indices, it is necessary to create a new relation to select the desired types
            this._createIndicesRelation(relations, button, relationId);
            this._upgradeButton(button, relationId);
          } else {
            // the type information is not necessary
            // try to find an existing relation without it
            const indicesRelations = _.filter(relations.relationsIndices, relation => {
              const leftIndex = relation.indices[0];
              const rightIndex = relation.indices[1];
              if (button.sourceIndexPatternId === leftIndex.indexPatternId &&
                  button.sourceField === leftIndex.path &&
                  button.targetIndexPatternId === rightIndex.indexPatternId &&
                  button.targetField === rightIndex.path) {
                return true;
              }
              return button.sourceIndexPatternId === rightIndex.indexPatternId &&
                button.sourceField === rightIndex.path &&
                button.targetIndexPatternId === leftIndex.indexPatternId &&
                button.targetField === leftIndex.path;
            });

            if (!indicesRelations.length) {
              this._logger.info(`No compatible relation was found, a new one with ID=${relationId} will be created based on the ` +
                                `configuration of the "${button.label}" button.`);
              this._createIndicesRelation(relations, button, relationId);
              this._upgradeButton(button, relationId);
            } else if (indicesRelations.length === 1) {
              this._logger.info(`A compatible relation with ID=${indicesRelations[0].id} will be used for the button "${button.label}"`);
              this._upgradeButton(button, indicesRelations[0].id);
            } else {
              const msg = `Found ${indicesRelations.length} relations from ${button.sourceIndexPatternId}.${button.sourceField}` +
              ` to ${button.targetIndexPatternId}.${button.targetField}, taking the first one with ID=${indicesRelations[0].id}.`;
              this._logger.info(msg);
              this._upgradeButton(button, indicesRelations[0].id);
            }
          }
        }
      }
      visState.version = 2;
      modified = true;
    }
    return modified;
  }

}
