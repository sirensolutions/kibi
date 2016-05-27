define(function (require) {

  var chrome = require('ui/chrome');
  var _ = require('lodash');

  require('ui/kibi/directives/kibi_entity_clipboard.less');

  require('ui/modules').get('kibana')
  .directive('kibiEntityClipboard', function (getAppState, $rootScope, $route, globalState, $http, Private) {

    var urlHelper = Private(require('ui/kibi/helpers/url_helper'));
    var kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));

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
              // fetch document and grab the field value to populate the label
              $http.get(chrome.getBasePath() + '/elasticsearch/' +  index + '/' + type + '/' + id).then(function (doc) {
                if (doc.data && doc.data._source && doc.data._source[column]) {
                  $scope.label = doc.data._source[column];
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
          globalState.save();

          // remove filters which depends on selected entities
          const currentDashboardId = urlHelper.getCurrentDashboardId();
          const filters = kibiStateHelper.getAllFilters();
          const appState = getAppState();
          _.forOwn(filters, (dashFilters, dashboardId) => {
            const filtersMinusEntities = _.filter(dashFilters, (f) => !f.meta.dependsOnSelectedEntities);
            // update the appstate
            if (currentDashboardId === dashboardId) {
              appState.filters = filtersMinusEntities;
            }
            // update the globalstate
            kibiStateHelper.saveFiltersForDashboardId(dashboardId, filtersMinusEntities);
          });
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
