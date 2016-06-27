define(function (require) {

  var chrome = require('ui/chrome');
  var _ = require('lodash');

  require('ui/kibi/directives/kibi_entity_clipboard.less');

  require('ui/modules').get('kibana')
  .directive('kibiEntityClipboard', function (kibiState, getAppState, $rootScope, $route, globalState, $http, createNotifier, config) {

    var notify = createNotifier({
      name: 'Kibi Entity Clipboard'
    });

    return {
      restrict: 'E',
      template: require('ui/kibi/directives/kibi_entity_clipboard.html'),
      replace: true,
      link: function ($scope, $el) {
        var updateSelectedEntity = function () {
          $scope.disabled = !!globalState.entityDisabled;
          if (globalState.se && globalState.se.length > 0) {
            // for now we support a single entity
            $scope.entityURI = globalState.se[0];
            var parts = globalState.se[0].split('/');
            if (parts.length === 4) {
              var index = parts[0];
              var type = parts[1];
              var id = parts[2];
              var column = parts[3];

              //delete the old label
              delete $scope.label;
              // fetch document and grab the field value to populate the label
              $http.get(chrome.getBasePath() + '/elasticsearch/' +  index + '/' + type + '/' + id).then(function (doc) {
                if (doc.data) {
                  if (config.get('metaFields').indexOf(column) !== -1 && doc.data[column]) {
                    // check if column is in meta fields
                    $scope.label = doc.data[column];
                  } else if (doc.data._source) {
                    // else try to find it in _source
                    var getProperty = _.property(column);
                    var value = getProperty(doc.data._source);
                    if (value !== null && typeof value === 'object') {
                      notify.warning('Entity label taken from [' + $scope.entityURI + '] is an object');
                    } else if (Object.prototype.toString.call(value) === '[object Array]') {
                      notify.warning('Entity label taken from [' + $scope.entityURI + '] is an array');
                    } else {
                      value = _.trunc(value, {
                        length: 65,
                        separator: ' '
                      });
                      $scope.label = value;
                    }
                  } else {
                    notify.warning('Could not get entity label from [' + $scope.entityURI + ']');
                  }
                }
              });
            } else {
              $scope.label = globalState.se[0];
            }
          }
        };

        $scope.removeAllEntities = function () {
          delete $scope.entityURI;
          delete $scope.label;
          delete $scope.disabled;
          delete globalState.entityDisabled;
          delete globalState.se;

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
          globalState.entityDisabled = !globalState.entityDisabled;
          globalState.save();
          // have to reload so all visualisations which might depend on selected entities
          // get refreshed
          $route.reload();
        };

        var removeHandler = $rootScope.$on('kibi:selectedEntities:changed', function (se) {
          updateSelectedEntity();
        });

        $scope.$on('$destroy', function () {
          removeHandler();
        });

        updateSelectedEntity();
      }
    };
  });
});
