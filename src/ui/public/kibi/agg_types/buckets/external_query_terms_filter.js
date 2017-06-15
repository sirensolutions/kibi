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
    createFilter,
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
          if (!_(queryDefinitions).pluck('queryId').compact().size()) {
            return;
          }

          const json = {};
          _.each(queryDefinitions, function (queryDef) {
            // validate the definition and do not add any filter if e.g. id == ''
            if (queryDef.queryId && queryDef.joinElasticsearchField && queryDef.queryVariableName) {
              const id = queryDef.queryId;
              // the label of the bucket gets the query title by the dbfilter lib
              const label = (queryDef.negate ? 'NOT ' : '') + id;

              const dbfilter = {
                queryid: id,
                negate: Boolean(queryDef.negate),
                queryVariableName: queryDef.queryVariableName,
                path: queryDef.joinElasticsearchField
              };
              if (!kibiState.isSelectedEntityDisabled()) {
                dbfilter.entity = kibiState.getEntityURI();
              }
              json[label] = { dbfilter };
            }
          });
          params.filters = json;
        }
      }
    ],
    version: 2
  });
};
