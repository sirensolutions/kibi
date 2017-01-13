import { onVisualizePage, onDashboardPage } from 'ui/kibi/utils/on_page';
import _ from 'lodash';
import ShouldEntityURIBeEnabledProvider from 'ui/kibi/components/commons/_should_entity_uri_be_enabled';

export default function MarkFiltersBySelectedEntitiesFactory(Promise, Private, kibiState) {
  const _shouldEntityURIBeEnabled = Private(ShouldEntityURIBeEnabledProvider);

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
        if (onVisualizePage() || onDashboardPage()) {
          filters[index].meta.markDependOnSelectedEntities = Boolean(kibiState.getEntityURI());
        }
      });
      return filters;
    });
  };
};
