import 'ui/kibi/directives/kibi_entity_clipboard.less';
import { onDashboardPage } from 'ui/kibi/utils/on_page';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import template from 'ui/kibi/directives/kibi_entity_clipboard.html';

uiModules.get('kibana')
.directive('kibiEntityClipboard', function (kibiState, getAppState, $route, globalState, es, createNotifier, config) {
  const notify = createNotifier({
    location: 'Kibi Entity Clipboard'
  });

  return {
    restrict: 'E',
    template,
    replace: true,
    link: function ($scope, $el) {

      const toURI = function (index, type, id, column = '') {
        return `${index}/${type}/${id}/${column}`;
      };

      const updateSelectedEntity = $scope.updateSelectedEntity = function () {
        if (!onDashboardPage()) {
          return;
        }

        $scope.disabled = Boolean(kibiState.isSelectedEntityDisabled());
        const entity = kibiState.getEntityURI();
        if (entity) {
          const { index, type, id, column } = entity;

          $scope.entityURI = toURI(index, type, id, column);
          $scope.label = $scope.entityURI;

          if (!column) {
            return;
          }
          // fetch document and grab the field value to populate the label
          // TODO: test when the column is a scripted field
          return es.search({
            size: 1,
            index,
            body: {
              query: {
                ids: {
                  type: type,
                  values: [ id ]
                }
              },
              _source: column
            }
          })
          .then(function (resp) {
            if (resp.hits.total) {
              const doc = resp.hits.hits[0];
              if (config.get('metaFields').indexOf(column) !== -1 && doc[column]) {
                // check if column is in meta fields
                $scope.label = doc[column];
              } else if (doc._source) {
                // else try to find it in _source
                let value = _.get(doc._source, column, ' - ');
                if (value.constructor === Object || value.constructor === Array) {
                  value = JSON.stringify(value);
                }
                value = _.trunc(value, {
                  length: 65,
                  separator: ' '
                });
                $scope.label = value;
              } else {
                notify.warning('Could not get the label for the entity [' + $scope.entityURI + ']');
              }
            }
          });
        }
      };

      $scope.$listen(kibiState, 'save_with_changes', function (diff) {
        if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
            diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1) {
          updateSelectedEntity();
        }
      });

      $scope.removeAllEntities = function () {
        delete $scope.entityURI;
        delete $scope.label;
        delete $scope.disabled;

        // remove the selecte entity
        kibiState.setEntityURI();
        kibiState.disableSelectedEntity(false);

        /*
        * remove filters which depends on selected entities
        */
        const currentDashboardId = kibiState._getCurrentDashboardId();
        const appState = getAppState();

        // check the pinned filters
        const pinnedFiltersMinusEntities = _.filter(globalState.filters, (f) => !f.meta.dependsOnSelectedEntities);
        globalState.filters = pinnedFiltersMinusEntities;

        // check the other filters from all dashboards
        _.each(kibiState.getAllDashboardIDs(), (dashboardId) => {
          let filtersMinusEntities = [];

          // update the appstate
          if (currentDashboardId === dashboardId) {
            filtersMinusEntities = _.filter(appState.filters, (f) => !f.meta.dependsOnSelectedEntities);
            appState.filters = filtersMinusEntities;
          } else {
            const kibiStateFilters = kibiState._getDashboardProperty(dashboardId, kibiState._properties.filters) || [];
            filtersMinusEntities = _.filter(kibiStateFilters, (f) => !f.meta.dependsOnSelectedEntities);
          }
          // update the kibistate
          kibiState._setDashboardProperty(dashboardId, kibiState._properties.filters, filtersMinusEntities);
        });

        globalState.save();
        kibiState.save();
        appState.save();

        // have to reload so all visualisations which might depend on selected entities
        // get refreshed
        $route.reload();
      };

      $scope.toggleClipboard = function () {
        $scope.disabled = !$scope.disabled;
        kibiState.disableSelectedEntity($scope.disabled);
        kibiState.save();
        // have to reload so all visualisations which might depend on selected entities
        // get refreshed
        $route.reload();
      };

      updateSelectedEntity();
    }
  };
});
