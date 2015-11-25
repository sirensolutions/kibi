define(function (require) {

  require('css!plugins/sindicetech/dashboard_groups_editor/styles/dashboard_groups_editor.css');
  require('plugins/sindicetech/dashboard_groups_editor/services/saved_dashboard_groups/_saved_dashboard_group');
  require('plugins/sindicetech/dashboard_groups_editor/services/saved_dashboard_groups/saved_dashboard_groups');
  require('angular-sanitize');
  require('ng-tags-input');

  var slugifyId = require('utils/slugify_id');
  var _ = require('lodash');
  var angular = require('angular');

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
          dashboardGroup : '/settings/dashboardgroups'
        }));
      }
    }
  });


  var app = require('modules').get('apps/settings', ['kibana', 'ngSanitize', 'ngTagsInput']);

  app.controller(
    'DashboardGroupsEditor',
    function ($rootScope, $scope, $route, $window, kbnUrl, Notifier, savedDashboards, savedDashboardGroups, Promise, $element) {

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

      $scope.filter = function (id, dashboard) {
        var allDashboards = _($scope.dashboardGroup.dashboards).pluck('id');

        if (!dashboard) {
          return allDashboards.value();
        }
        return allDashboards.compact().contains(dashboard);
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

      function getNumberOfDashboards() {
        return savedDashboards.find().then(function (data) {
          $scope.nbDashboards = data.hits ? data.hits.length : 0;
        });
      }
      $scope.nbDashboards = 0;
      getNumberOfDashboards();

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
            notify.info('Dashboard Group ' + savedDashboardGroupClone.title + ' was successfuly cloned');
            $rootScope.$emit('kibi:dashboardgroup:changed', resp);
            kbnUrl.change('settings/dashboardgroups/' + slugifyId(savedDashboardGroupClone.id));
          });

        });
      };

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
