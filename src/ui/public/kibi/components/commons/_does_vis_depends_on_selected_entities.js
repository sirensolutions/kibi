define(function (require) {

  return function DoesVisDependsOnSelectedEntitiesFactory(Promise, Private) {

    var _ = require('lodash');
    var _shouldEntityURIBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));

    return function (vis) {
      const name = vis.type.name;
      var queryIds;
      if (name === 'kibi-data-table') {
        queryIds = _.map(vis.params.queryIds, function (snippet) {
          return snippet.queryId;
        });
        return _shouldEntityURIBeEnabled(queryIds);
      } else if (name === 'kibiqueryviewervis') {
        queryIds = _.map(vis.params.queryOptions, function (snippet) {
          return snippet.queryId;
        });
        return _shouldEntityURIBeEnabled(queryIds);
      } else if (name === 'table' || name === 'pie' || name === 'area' || name === 'line' || name === 'histogram') {
        // check agregations and if any of them has param queryIds use it to test
        var index;
        _.each(vis.aggs, function (agg, i) {
          if (agg.params && agg.params.queryIds) {
            index = i;
            return false;
          }
        });

        if (index !== undefined) {
          queryIds = _.map(vis.aggs[index].params.queryIds, function (snippet) {
            return snippet.id;
          });

          return _shouldEntityURIBeEnabled(queryIds);
        } else {
          return Promise.resolve(false);
        }
      } else {
        return Promise.resolve(false);
      }
    };
  };
});
