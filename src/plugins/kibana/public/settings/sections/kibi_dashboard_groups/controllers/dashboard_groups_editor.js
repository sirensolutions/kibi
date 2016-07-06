define(function (require) {

  require('ui/kibi/directives/kibi_array_param');
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_param_entity_uri');

  require('plugins/kibana/settings/sections/kibi_dashboard_groups/styles/dashboard_groups_editor.less');
  require('plugins/kibana/settings/sections/kibi_dashboard_groups/services/_saved_dashboard_group');
  require('plugins/kibana/settings/sections/kibi_dashboard_groups/services/saved_dashboard_groups');

  var kibiUtils = require('kibiutils');
  var _ = require('lodash');
  var angular = require('angular');

  require('ui/routes')
  .when('/settings/dashboardgroups', {
    template: require('plugins/kibana/settings/sections/kibi_dashboard_groups/index.html'),
    reloadOnSearch: false,
    resolve: {
      dashboardGroup: function (savedDashboardGroups) {
        return savedDashboardGroups.get();
      }
    }
  })
  .when('/settings/dashboardgroups/:id?', {
    template: require('plugins/kibana/settings/sections/kibi_dashboard_groups/index.html'),
    reloadOnSearch: false,
    resolve: {
      dashboardGroup: function ($route, courier, savedDashboardGroups) {
        return savedDashboardGroups.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          dashboardGroup : '/settings/dashboardgroups'
        }));
      }
    }
  });


  var app = require('ui/modules').get('apps/settings', ['kibana']);

  app.controller(
    'DashboardGroupsEditor',
    function ($rootScope, $scope, $route, $window, kbnUrl, createNotifier, savedDashboards, savedDashboardGroups, Promise, $element) {

      var notify = createNotifier({
        location: 'Dashboard Groups Editor'
      });


      $scope.dashboardGroupsFinderOpen = false;

      $scope.openDashboardGroupsFinder = function () {
        $scope.dashboardGroupsFinderOpen = true;
      };
      $scope.closeDashboardGroupsFinder = function (hit, event) {
        $scope.dashboardGroupsFinderOpen = false;
        kbnUrl.change('settings/dashboardgroups/' + hit.id);
      };

      var dashboardGroup = $scope.dashboardGroup = $route.current.locals.dashboardGroup;

      var allDashboardsGroups = [];

      savedDashboardGroups.find().then(function (data) {
        allDashboardsGroups = data;
      });

      $scope.filter = function (id, item) {
        var dashboard = item && item.value;
        var allDashboards = _($scope.dashboardGroup.dashboards).pluck('id');

        if (!dashboard) {
          return allDashboards.value();
        }

        var toRemove = false;
        _.each(allDashboardsGroups.hits,function (hits) {
          _.each(hits.dashboards,function (hitDashboard) {
            hitDashboard.id = (hitDashboard.id).replace(/-/g, ' ');
            if ((hitDashboard.id).indexOf(item.label) !== -1) {
              toRemove = true;
              return false;
            }
          });
          if (toRemove) {
            return false;
          }
        });

        return toRemove || allDashboards.compact().contains(dashboard);
      };

      $scope.submit = function () {
        if (!$element.find('form[name="objectForm"]').hasClass('ng-valid')) {
          $window.alert('Please fill in all the required parameters.');
          return;
        }
        dashboardGroup.id = dashboardGroup.title;
        dashboardGroup.save().then(function (groupId) {
          notify.info('Dashboard Group ' + dashboardGroup.title + ' was successfuly saved');
          $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
          kbnUrl.change('settings/dashboardgroups/' + kibiUtils.slugifyId(dashboardGroup.id));
        });
      };

      $scope.newDashboardGroup = function () {
        kbnUrl.change('settings/dashboardgroups', {});
      };

      function getNumberOfDashboards() {
        return savedDashboards.find().then(function (data) {
          $scope.nbDashboards = data.hits ? data.hits.length : 0;
        });
      }
      $scope.nbDashboards = 0;
      getNumberOfDashboards();

      function addTitle() {
        var promises = _($scope.dashboardGroup.dashboards).filter(function (d) {
          return !!d.id && !d.title;
        }).map(function (d) {
          return savedDashboards.get(d.id);
        }).value();

        if (promises.length === 0) {
          return;
        }
        Promise.all(promises).then(function (dashboards, index) {
          _.each(dashboards, function (dashboard) {
            _.find($scope.dashboardGroup.dashboards, function (d) {
              return d.id === dashboard.id;
            }).title = dashboard.title;
          });
        });
      }

      $scope.$watch('dashboardGroup.dashboards', function () {
        addTitle();
      }, true);

    });
});
