define(function (require) {
  return function MarkFiltersBySelectedEntitiesFactory(Promise, Private, kibiState) {
    const chrome = require('ui/chrome');
    const _ = require('lodash');
    const _shouldEntityURIBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));

    return function (filters) {
      const promises = _.map(filters, filter => {
        if (filter.dbfilter) {
          return _shouldEntityURIBeEnabled([filter.dbfilter.queryid]);
        }
        return Promise.resolve(false);
      });

      return Promise.all(promises).then(function (results) {
        _.each(results, function (res, index) {
          filters[index].meta.dependsOnSelectedEntities = res;
          filters[index].meta.dependsOnSelectedEntitiesDisabled = res && kibiState.isSelectedEntityDisabled();
          filters[index].meta.markDependOnSelectedEntities = false;
          if (chrome.onVisualizeTab() || chrome.onDashboardTab()) {
            filters[index].meta.markDependOnSelectedEntities = Boolean(kibiState.getEntityURI());
          }
        });
        return filters;
      });
    };
  };
});
