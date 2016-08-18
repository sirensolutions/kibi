define(function (require) {

  return function MarkFiltersBySelectedEntitiesFactory(Promise, Private, kibiState) {

    var _ = require('lodash');
    var _shouldEntityURIBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));

    return function (filters) {
      var promises = [];
      _.each(filters, function (filter) {
        if (filter.dbfilter) {
          promises.push(_shouldEntityURIBeEnabled([filter.dbfilter.queryid]));
        } else {
          promises.push(Promise.resolve(false));
        }
      });

      return Promise.all(promises).then(function (results) {
        _.each(results, function (res, index) {
          filters[index].meta.dependsOnSelectedEntities = res;
          filters[index].meta.dependsOnSelectedEntitiesDisabled = res && kibiState.isSelectedEntityDisabled();
          filters[index].meta.markDependOnSelectedEntities = Boolean(kibiState.getEntityURI(true));
        });
        return filters;
      });
    };
  };
});
