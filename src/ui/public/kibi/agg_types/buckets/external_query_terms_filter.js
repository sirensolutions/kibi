define(function (require) {
  return function RelatedEntitiesAggDefinition(Private, createNotifier, globalState, $rootScope, $timeout, $location) {

    // a bit of css
    require('ui/kibi/styles/external_query_terms_filter.less');

    var _ = require('lodash');
    var BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    var createFilter = Private(require('ui/agg_types/buckets/create_filter/filters'));
    var _shouldEntityURIBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));
    var notify = createNotifier({ location: 'External Query Terms Filter Aggregation' });

    var everySocondTick = false;

    return new BucketAggType({
      name: 'external_query_terms_filter',
      dslName: 'filters',
      title: 'External Query Terms Filter',
      createFilter: createFilter,
      params: [
        {
          name: 'queryIds',
          editor: require('ui/kibi/agg_types/controls/external_query_terms_filter.html'),
          default: [],
          write: function (aggConfig, output) {
            var params = output.params || (output.params = {});
            // initialy set filters to empty object
            params.filters = {};

            var queryIdsObject = aggConfig.params.queryIds;
            if (!_.size(queryIdsObject)) return;

            var queryIds = _.map(queryIdsObject, function (queryId) {
              return queryId.id;
            });

            if (!_.size(queryIds)) return;


            var configurationMode = $location.path().indexOf('/visualize/') === 0;

            var json = {};
            _.each(aggConfig.params.queryIds, function (queryIdDef) {

              // validate the definition and do not add any filter if e.g. id == ''
              if (queryIdDef.id &&
                 queryIdDef.id !== '' &&
                 queryIdDef.joinElasticsearchField &&
                 queryIdDef.joinElasticsearchField !== '' &&
                 queryIdDef.queryVariableName && queryIdDef.queryVariableName !== ''
              ) {

                var dbfilter = {
                  queryid: queryIdDef.id,
                  negate: queryIdDef.negate ? true : false,
                  queryVariableName: queryIdDef.queryVariableName,
                  path: queryIdDef.joinElasticsearchField
                };
                // add entity only if present - prevent errors when comparing 2 filters
                // as undefined value is not preserved in url it will get lost
                // and 2 dbfilters migth appear as different one

                // here depends that we are in configuration mode or not
                // pick selected entityURI from different places
                if (configurationMode && globalState.se_temp && globalState.se_temp.length > 0 && !globalState.entityDisabled) {
                  dbfilter.entity = globalState.se_temp[0];
                } else if (!configurationMode && globalState.se && globalState.se.length > 0 && !globalState.entityDisabled) {
                  dbfilter.entity = globalState.se[0];
                }

                // here we need a label for each one for now it is queryid
                var label = (queryIdDef.negate ? 'Not-' : '') + queryIdDef.id;
                json[label] = {
                  dbfilter: dbfilter
                };
              }

            });

            // Note: run every second tick
            // workaround for https://github.com/sirensolutions/kibi-internal/issues/724
            if (everySocondTick === false) {
              everySocondTick = true;
              _shouldEntityURIBeEnabled(queryIds).then(function (value) {
                $timeout(function () {
                  $rootScope.$emit('kibi:entityURIEnabled:external_query_terms_filter', value);
                  everySocondTick = false;
                });
              }).catch(function (err) {
                notify.warning('Could not determine the entity URI for this visualisation: ' +
                  JSON.stringify(err, null, ' '));
              });
            }


            params.filters = json;
          }
        }
      ]
    });
  };
});
