define(function (require) {
  var moment = require('moment');
  var $ = require('jquery');
  require('modules')
  .get('app/dashboard')
  .directive('dashboardPanel', function ($rootScope, globalState, savedVisualizations, savedSearches, Notifier, Private, $injector) {
    var _ = require('lodash');
    var loadPanel = Private(require('plugins/dashboard/components/panel/lib/load_panel'));
    var filterManager = Private(require('components/filter_manager/filter_manager'));
    var notify = new Notifier();
    var _does_vis_depends_on_selected_entities = Private(require('plugins/kibi/commons/_does_vis_depends_on_selected_entities'));

    var services = require('plugins/settings/saved_object_registry').all().map(function (serviceObj) {
      var service = $injector.get(serviceObj.service);
      return {
        type: service.type,
        name: serviceObj.service
      };
    });

    require('components/visualize/visualize');
    require('components/doc_table/doc_table');

    var brushEvent = Private(require('utils/brush_event'));

    return {
      restrict: 'E',
      template: require('text!plugins/dashboard/components/panel/panel.html'),
      requires: '^dashboardGrid',
      link: function ($scope, $el) {
        // using $scope inheritance, panels are available in AppState
        var $state = $scope.state;

        // receives $scope.panel from the dashboard grid directive, seems like should be isolate?
        $scope.$watch('id', function (id) {
          if (!$scope.panel.id || !$scope.panel.type) return;

          loadPanel($scope.panel, $scope).then(function (panelConfig) {
            // These could be done in loadPanel, putting them here to make them more explicit
            $scope.savedObj = panelConfig.savedObj;

            // kibi: added visualisation id and handle the entity selection events
            if ($scope.savedObj && $scope.savedObj.vis) {
              $scope.savedObj.vis.id = panelConfig.savedObj.id;
            }
            $scope.markDependOnSelectedEntities = globalState.se && globalState.se.length > 0;
            $scope.selectedEntitiesDisabled = globalState.entityDisabled;
            var off1 = $rootScope.$on('kibi:entityURIEnabled', function (event, entityURIEnabled) {
              $scope.markDependOnSelectedEntities = globalState.se && globalState.se.length > 0;
              $scope.selectedEntitiesDisabled = globalState.entityDisabled;
            });
            var off2 = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
              $scope.markDependOnSelectedEntities = globalState.se && globalState.se.length > 0;
              $scope.selectedEntitiesDisabled = globalState.entityDisabled;
            });

            _does_vis_depends_on_selected_entities($scope.savedObj.vis).then(function (does) {
              $scope.dependsOnSelectedEntities = does;
            });
            // kibi end

            $scope.edit = panelConfig.edit;
            $scope.editUrl = panelConfig.editUrl;
            $scope.$on('$destroy', function () {
              panelConfig.savedObj.destroy();
              off1();
              off2();
            });

            $scope.filter = function (field, value, operator) {
              var index = $scope.savedObj.searchSource.get('index').id;
              filterManager.add(field, value, operator, index);
            };
          }).catch(function (e) {
            $scope.error = e.message;

            // If the savedObjectType matches the panel type, this means the object itself has been deleted,
            // so we shouldn't even have an edit link. If they don't match, it means something else is wrong
            // with the object (but the object still exists), so we link to the object editor instead.
            var objectItselfDeleted = e.savedObjectType === $scope.panel.type;
            if (objectItselfDeleted) return;

            var type = $scope.panel.type;
            var id = $scope.panel.id;
            var service = _.find(services, { type: type });
            if (!service) return;

            $scope.editUrl = '#settings/objects/' + service.name + '/' + id + '?notFound=' + e.savedObjectType;
          });

        });

        $scope.remove = function () {
          _.pull($state.panels, $scope.panel);
        };
      }
    };
  });
});
