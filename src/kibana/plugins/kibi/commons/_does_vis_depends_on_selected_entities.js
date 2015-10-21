define(function (require) {

  return function DoesVisDependsOnSelectedEntitiesFactory(Promise, Private) {

    var _ = require('lodash');
    var _shouldEntityURIBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));

    return function (vis) {
      return new Promise(function (fulfill, reject) {

        var queryIds;
        if (vis.type.name === 'sindicetechtable') {
          queryIds = _.map(vis.params.queryIds, function (snippet) {
            return snippet.queryId;
          });
          _shouldEntityURIBeEnabled(queryIds).then(function (value) {
            fulfill(value);
          }).catch(function (err) {
            reject(err);
          });
        } else if (vis.type.name === 'sindicetechentityinfo') {
          queryIds = _.map(vis.params.queryOptions, function (snippet) {
            return snippet.queryId;
          });
          _shouldEntityURIBeEnabled(queryIds).then(function (value) {
            fulfill(value);
          }).catch(function (err) {
            reject(err);
          });
        } else if (vis.type.name === 'table' ||
                   vis.type.name === 'pie' ||
                   vis.type.name === 'area' ||
                   vis.type.name === 'line' ||
                   vis.type.name === 'histogram'
        ) {
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

            _shouldEntityURIBeEnabled(queryIds).then(function (value) {
              fulfill(value);
            }).catch(function (err) {
              reject(err);
            });
          } else {
            fulfill(false);
          }

        } else {
          fulfill(false);
        }

      });
    };
  };
});
