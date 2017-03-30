import 'ui/kibi/directives/kibi_entity_clipboard.less';
import { onDashboardPage } from 'ui/kibi/utils/on_page';
import uiModules from 'ui/modules';
import _ from 'lodash';
import chrome from 'ui/chrome';
import template from 'ui/kibi/directives/kibi_entity_clipboard.html';

uiModules.get('kibana')
.directive('kibiEntityClipboard', function (kibiState, getAppState, $route, globalState, $http, createNotifier, config) {
  const notify = createNotifier({
    location: 'Kibi Entity Clipboard'
  });

  return {
    restrict: 'E',
    template,
    replace: true,
    link: function ($scope, $el) {

      const updateSelectedEntity = function () {
        if (!onDashboardPage()) {
          return;
        }

        $scope.disabled = Boolean(kibiState.isSelectedEntityDisabled());
        $scope.entityURI = kibiState.getEntityURI();
        if ($scope.entityURI) {
          const parts = $scope.entityURI.split('/');
          const index = parts[0];
          const type = parts[1];
          const id = parts[2];
          const column = parts[3];

          //delete the old label
          delete $scope.label;
          // fetch document and grab the field value to populate the label
          $http.get(`${chrome.getBasePath()}/elasticsearch/${index}/${type}/${id}`).then(function (doc) {
            $scope.label = $scope.entityURI;
            if (doc.data && column) {
              if (config.get('metaFields').indexOf(column) !== -1 && doc.data[column]) {
                // check if column is in meta fields
                $scope.label = doc.data[column];
              } else if (doc.data._source) {
                // else try to find it in _source
                const getProperty = _.property(column);
                let value = getProperty(doc.data._source) || ' - ';
                if (value.constructor === Object || value.constructor === Array) {
                  value = JSON.stringify(value);
                }
                value = _.trunc(value, {
                  length: 65,
                  separator: ' '
                });
                $scope.label = value;
              } else {
                notify.warning('Could not get entity label from [' + $scope.entityURI + ']');
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
        kibiState.setEntityURI(null);
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
