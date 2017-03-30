import { onVisualizePage } from 'ui/kibi/utils/on_page';
import 'ui/kibi/styles/external_query_terms_filter.less';
import _ from 'lodash';
import BucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import CreateFilterProvider from 'ui/agg_types/buckets/create_filter/filters';
import editor from 'ui/kibi/agg_types/controls/external_query_terms_filter.html';

export default function RelatedEntitiesAggDefinition(Private, createNotifier, kibiState, $rootScope, $timeout) {
  const BucketAggType = Private(BucketAggTypeProvider);
  const createFilter = Private(CreateFilterProvider);
  const notify = createNotifier({ location: 'External Query Terms Filter Aggregation' });

  return new BucketAggType({
    name: 'external_query_terms_filter',
    dslName: 'filters',
    title: 'External Query Terms Filter',
    createFilter: createFilter,
    params: [
      {
        name: 'queryDefinitions',
        editor,
        default: [],
        write: function (aggConfig, output) {
          const params = output.params || (output.params = {});
          // initialy set filters to empty object
          params.filters = {};

          const queryDefinitions = aggConfig.params.queryDefinitions;
          if (!_.size(queryDefinitions)) {
            return;
          }

          const configurationMode = onVisualizePage();

          if (!_(queryDefinitions).pluck('queryId').compact().size()) {
            return;
          }

          const json = {};
          _.each(queryDefinitions, function (queryDef) {
            // validate the definition and do not add any filter if e.g. id == ''
            if (queryDef.queryId && queryDef.joinElasticsearchField && queryDef.queryVariableName) {
              const id = queryDef.queryId;
              // here we need a label for each one for now it is queryid
              const label = (queryDef.negate ? 'Not-' : '') + id;

              json[label] = {
                dbfilter: {
                  entity: kibiState.isSelectedEntityDisabled() ? '' : kibiState.getEntityURI(),
                  queryid: id,
                  negate: queryDef.negate ? true : false,
                  queryVariableName: queryDef.queryVariableName,
                  path: queryDef.joinElasticsearchField
                }
              };
            }
          });
          params.filters = json;
        }
      }
    ],
    version: 2
  });
};
