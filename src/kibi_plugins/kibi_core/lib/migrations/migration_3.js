import { transform } from 'lodash';
import Migration from 'kibiutils/lib/migrations/migration';

/**
 * Kibi Core - Migration 3.
 *
 * Looks for:
 *
 * - visualizations of type 'kibi-data-table' and 'kibiqueryviewervis'
 * - bucket aggregations of type 'external_query_terms_filter'
 *
 * Then:
 *
 * - renames `queryIds` or `queryOptions` to `queryDefinitions`.
 * - for each query in `queryDefinitions`, renames `id` to `queryId` and removes the `isEntityDependent` attribute.
 * - removes the `hasEntityDependent` attribute from the visualization state parameters.
 * - sets the version to of the visualization state/bucket aggregation type to `2`.
 */

export default class Migration3 extends Migration {

  constructor(configuration) {
    super(configuration);

    this._client = configuration.client;
    this._logger = configuration.logger;
    this._index = configuration.index;
    this._type = 'visualization';
  }

  static get description() {
    return 'Upgrade saved queries definitions in external query terms aggregation, enhanced search results and query viewer.';
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

  async upgrade() {
    const objects = await this.scrollSearch(this._index, this._type);
    if (objects.length === 0) {
      return 0;
    }
    let body = '';
    let upgraded = 0;
    for (const obj of objects) {
      const visState = JSON.parse(obj._source.visState);
      const modified = this._upgradeVisualizationState(visState);

      if (!modified) {
        continue;
      }

      body += JSON.stringify({
        update: {
          _index: obj._index,
          _type: obj._type,
          _id: obj._id
        }
      }) + '\n' + JSON.stringify({
        doc: {
          visState: JSON.stringify(visState)
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
   * Checks if a visualization state is upgradeable.
   */
  _isUpgradeable(visState) {
    if (!visState.version && (visState.type === 'kibi-data-table' || visState.type === 'kibiqueryviewervis')) {
      return true;
    }
    if (visState.aggs) {
      for (const agg of visState.aggs) {
        if (agg.schema === 'bucket' && agg.type === 'external_query_terms_filter' && !agg.version) {
          return true;
        }
      }
    }
  }

  /**
   * Upgrades a visualization state.
   *
   * @param {Object} visState The state to upgrade.
   * @retval {Boolean} true if the state has been modified.
   * @retval {Boolean} false if the state has not been modified.
   */
  _upgradeVisualizationState(visState) {
    let modified = false;

    if (!visState.version) {

      if (visState.type === 'kibi-data-table') {
        if (!visState.params) {
          visState.params = {};
        }
        if (visState.params.queryDefinitions) {
          this._logger.warning(`The visualization state already contains an attribute named queryDefinitions, skipping transformation.`);
        } else {
          visState.params.queryDefinitions = [];
          if (visState.params.queryIds) {
            for (const queryDef of visState.params.queryIds) {
              visState.params.queryDefinitions.push({
                queryId: queryDef.id,
                queryVariableName: queryDef.queryVariableName
              });
            }
            delete visState.params.queryIds;
          }
        }
        delete visState.params.hasEntityDependentQuery;
        visState.version = 2;
        modified = true;
      }

      if (visState.type === 'kibiqueryviewervis') {
        if (!visState.params) {
          visState.params = {};
        }
        if (visState.params.queryDefinitions) {
          this._logger.warning(`The visualization state already contains an attribute named queryDefinitions, skipping transformation.`);
        } else {
          visState.params.queryDefinitions = [];
          if (visState.params.queryOptions) {
            for (const queryDef of visState.params.queryOptions) {
              delete queryDef.isEntityDependent;
              visState.params.queryDefinitions.push(queryDef);
            }
            delete visState.params.queryOptions;
          }
        }
        delete visState.params.hasEntityDependentQuery;
        visState.version = 2;
        modified = true;
      }

    }

    if (visState.aggs) {
      for (const agg of visState.aggs) {
        if (agg.schema === 'bucket' && agg.type === 'external_query_terms_filter' && !agg.version) {
          if (!agg.params) {
            agg.params = {};
          }
          if (agg.params.queryDefinitions) {
            this._logger.warning(`The aggregator already contains an attribute named queryDefinitions, skipping transformation.`);
          } else {
            agg.params.queryDefinitions = [];
            if (agg.params.queryIds) {
              for (const queryDef of agg.params.queryIds) {
                agg.params.queryDefinitions.push({
                  queryId: queryDef.id,
                  joinElasticsearchField: queryDef.joinElasticsearchField,
                  queryVariableName: queryDef.queryVariableName
                });
              }
              delete agg.params.queryIds;
            }
          }
          agg.version = 2;
          modified = true;
        }
      }
    }
    return modified;
  }

}
