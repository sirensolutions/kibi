import shouldEntityUriBeEnabledProvider from 'ui/kibi/components/commons/_should_entity_uri_be_enabled';
import _ from 'lodash';

export default function DoesVisDependsOnSelectedEntitiesFactory(Promise, Private) {
  const _shouldEntityURIBeEnabled = Private(shouldEntityUriBeEnabledProvider);

  return function (vis) {
    const name = vis.type.name;
    let queryIds;
    if (name === 'kibi-data-table' && vis.params.enableQueryFields) {
      queryIds = _.map(vis.params.queryDefinitions, function (queryDef) {
        return queryDef.queryId;
      });
    } else if (name === 'kibiqueryviewervis') {
      queryIds = _.map(vis.params.queryDefinitions, function (queryDef) {
        return queryDef.queryId;
      });
    } else if (name === 'table' || name === 'pie' || name === 'area' || name === 'line' || name === 'histogram') {
      // check agregations and if any of them has param queryDefinitions use it to test
      let index = -1;
      _.each(vis.aggs, function (agg, i) {
        if (agg.params && agg.params.queryDefinitions) {
          index = i;
          return false;
        }
      });

      if (index !== -1) {
        queryIds = _.map(vis.aggs[index].params.queryDefinitions, function (queryDef) {
          return queryDef.queryId;
        });
      }
    }
    return queryIds ? _shouldEntityURIBeEnabled(queryIds) : Promise.resolve(false);
  };
};
