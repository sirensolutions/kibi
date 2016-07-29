define(function (require) {
  return function RelatedEntitiesAggDefinition(Private, createNotifier, globalState, $rootScope, $timeout) {

    // a bit of css
    require('ui/kibi/styles/external_query_terms_filter.less');

    var _ = require('lodash');
    var urlHelper = Private(require('ui/kibi/helpers/url_helper'));
    var BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('ui/agg_types/buckets/create_filter/filters'));
    var notify = createNotifier({ location: 'External Query Terms Filter Aggregation' });

    return new BucketAggType({
      name: 'external_query_terms_filter',
      dslName: 'filters',
      title: 'External Query Terms Filter',
      createFilter: createFilter,
      params: [
        {
          name: 'queryDefinitions',
          editor: require('ui/kibi/agg_types/controls/external_query_terms_filter.html'),
          default: [],
          write: function (aggConfig, output) {
            const params = output.params || (output.params = {});
            // initialy set filters to empty object
            params.filters = {};

            const queryDefinitions = aggConfig.params.queryDefinitions;
            if (!_.size(queryDefinitions)) {
              return;
            }

            const configurationMode = urlHelper.onVisualizeTab();
            let entityURI;
            // here depends that we are in configuration mode or not
            // pick selected entityURI from different places
            if (configurationMode && globalState.se_temp && globalState.se_temp.length > 0 && !globalState.entityDisabled) {
              entityURI = globalState.se_temp[0];
            } else if (!configurationMode && globalState.se && globalState.se.length > 0 && !globalState.entityDisabled) {
              entityURI = globalState.se[0];
            }

            if (!_(queryDefinitions).pluck('query.id').compact().size()) {
              return;
            }

            const json = {};
            let hasEntityDependentQuery = false;

            _.each(queryDefinitions, function (queryDef) {
              const isEntityDependent = queryDef.query.is_entity_dependent;
              if (isEntityDependent) {
                hasEntityDependentQuery = true;
              }

              // validate the definition and do not add any filter if e.g. id == ''
              if (queryDef.query.id && queryDef.joinElasticsearchField && queryDef.queryVariableName) {
                const id = queryDef.query.id;
                // here we need a label for each one for now it is queryid
                const label = (queryDef.negate ? 'Not-' : '') + id;

                json[label] = {};
                if (!isEntityDependent || entityURI) {
                  json[label].dbfilter = {};
                  json[label].dbfilter.entity = entityURI;
                  json[label].dbfilter.queryid = id;
                  json[label].dbfilter.negate = queryDef.negate ? true : false;
                  json[label].dbfilter.queryVariableName = queryDef.queryVariableName;
                  json[label].dbfilter.path = queryDef.joinElasticsearchField;
                } else {
                  json[label].bool = {};
                  json[label].bool[queryDef.negate ? 'must_not' : 'should'] = [
                    {
                      term: {
                        snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
                      }
                    }
                  ];
                }
              }
            });

            $rootScope.$emit('kibi:entityURIEnabled:external_query_terms_filter', hasEntityDependentQuery);
            params.filters = json;
          }
        }
      ]
    });
  };
});
