define(function (require) {

  require('css!plugins/sindicetech/dashboard_groups_editor/styles/dashboard_groups_editor.css');
  require('plugins/sindicetech/dashboard_groups_editor/services/saved_dashboard_groups/_saved_dashboard_group');
  require('plugins/sindicetech/dashboard_groups_editor/services/saved_dashboard_groups/saved_dashboard_groups');
  require('angular-sanitize');
  require('ng-tags-input');

  var slugifyId = require('utils/slugify_id');
  var $ = require('jquery');
  var _ = require('lodash');
  require('routes')
  .when('/settings/dashboardgroups', {
    template: require('text!plugins/sindicetech/dashboard_groups_editor/index.html'),
    reloadOnSearch: false,
    resolve: {
      dashboardGroup: function (savedDashboardGroups) {
        return savedDashboardGroups.get();
      }
    }
  })
  .when('/settings/dashboardgroups/:id?', {
    template: require('text!plugins/sindicetech/dashboard_groups_editor/index.html'),
    reloadOnSearch: false,
    resolve: {
      dashboardGroup: function ($route, courier, savedDashboardGroups) {
        return savedDashboardGroups.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'dashboardGroup' : '/settings/dashboardgroups'
        }));
      }
    }
  });


  var app = require('modules').get('apps/settings', ['kibana', 'ngSanitize', 'ngTagsInput']);

  app.controller(
    'DashboardGroupsEditor',
    function ($rootScope, $scope, $route, $window, kbnUrl, Notifier, savedDashboards, savedDashboardGroups, Private, Promise) {

      var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

      var notify = new Notifier({
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

      $scope.submit = function () {
        dashboardGroup.id = dashboardGroup.title;
        dashboardGroup.save().then(function (groupId) {
          notify.info('DashboardGroup ' + dashboardGroup.title + ' successfuly saved');
          $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
          kbnUrl.change('settings/dashboardgroups/' + slugifyId(dashboardGroup.id));
        });
      };

      $scope.delete = function () {
        if ($window.confirm('Are you sure about deleting [' + dashboardGroup.title + ']')) {
          dashboardGroup.delete().then(function (resp) {
            $rootScope.$emit('kibi:dashboardgroup:changed', resp);
            kbnUrl.change('settings/dashboardgroups', {});
          });
        }
      };

      $scope.newDashboardGroup = function () {
        kbnUrl.change('settings/dashboardgroups', {});
      };

      $scope.clone = function () {
        savedDashboardGroups.get().then(function (savedDashboardGroupClone) {
          savedDashboardGroupClone.id = dashboardGroup.id + '-clone';
          savedDashboardGroupClone.title = dashboardGroup.title + ' clone';
          savedDashboardGroupClone.description = dashboardGroup.description;
          savedDashboardGroupClone.dashboards = dashboardGroup.dashboards;
          savedDashboardGroupClone.priority = dashboardGroup.priority + 1;
          savedDashboardGroupClone.iconCss = dashboardGroup.iconCss;
          savedDashboardGroupClone.iconUrl = dashboardGroup.iconUrl;

          savedDashboardGroupClone.save().then(function (resp) {
            notify.info('DashboardGroup ' + savedDashboardGroupClone.title + 'successfuly saved');
            $rootScope.$emit('kibi:dashboardgroup:changed', resp);
            kbnUrl.change('settings/dashboardgroups/' + slugifyId(savedDashboardGroupClone.id));
          });

        });
      };

      $scope.$watch('dashboardGroup.dashboards', function () {
        var dashboards;
        try {
          dashboards = JSON.parse($scope.dashboardGroup.dashboards);
          if (dashboards instanceof Array) {
            $scope.dashboardGroup.dashboards_o = dashboards;
          } else {
            $scope.dashboardGroup.dashboards_o = [];
          }
        } catch (e) {
          $scope.dashboardGroup.dashboards_o = [];
        }
      });

      $scope.$watch('dashboardGroup.dashboards_o', function () {
        dashboardsToString();
      }, true);


      var dashboardsToString = function () {
        var promises = [];
        _.each($scope.dashboardGroup.dashboards_o, function (d) {
          promises.push(savedDashboards.get(d.id));
        });

        Promise.all(promises).then(function (dashboards, index) {
          _.each(dashboards, function (dashboard, index) {
            $scope.dashboardGroup.dashboards_o[index].title = dashboard.title;
          });

          $scope.dashboardGroup.dashboards = JSON.stringify($scope.dashboardGroup.dashboards_o, function (key, value) {
            return key === '$$hashKey' ? undefined : value;
          }, ' ');
        });
      };

      $scope.addDashboard = function () {
        if (!$scope.dashboardGroup.dashboards_o) {
          $scope.dashboardGroup.dashboards_o = [];
        }
        arrayHelper.add($scope.dashboardGroup.dashboards_o, {id: ''}, dashboardsToString);
      };

      $scope.removeDashboard = function (index) {
        arrayHelper.remove($scope.dashboardGroup.dashboards_o, index, dashboardsToString);
      };

      $scope.upDashboard = function (index) {
        arrayHelper.up($scope.dashboardGroup.dashboards_o, index, dashboardsToString);
      };

      $scope.downDashboard = function (index) {
        arrayHelper.down($scope.dashboardGroup.dashboards_o, index, dashboardsToString);
      };


    });
});
