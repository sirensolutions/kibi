import 'ui/kibi/directives/kibi_array_param';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_param_entity_uri';
import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/styles/dashboard_groups_editor.less';
import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/_saved_dashboard_group';
import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/services/saved_dashboard_groups';
import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import template from 'plugins/kibi_core/management/sections/kibi_dashboard_groups/index.html';

uiRoutes
.when('/management/kibana/dashboardgroups', {
  template,
  reloadOnSearch: false,
  resolve: {
    dashboardGroup: function (savedDashboardGroups) {
      return savedDashboardGroups.get();
    }
  }
})
.when('/management/kibana/dashboardgroups/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    dashboardGroup: function ($route, courier, savedDashboardGroups) {
      return savedDashboardGroups.get($route.current.params.id)
      .catch(courier.redirectWhenMissing({
        dashboardGroup: '/management/kibana/dashboardgroups'
      }));
    }
  }
});

function controller($rootScope, $scope, $route, kbnUrl, createNotifier, savedDashboards, savedDashboardGroups, Promise, $element) {
  const notify = createNotifier({
    location: 'Dashboard Groups Editor'
  });
  const dashboardGroup = $scope.dashboardGroup = $route.current.locals.dashboardGroup;

  let allDashboardsGroups = [];

  savedDashboardGroups.find().then(function (data) {
    allDashboardsGroups = data.hits;
  });

  $scope.filter = function (item, options, selected) {
    if (selected) {
      return false;
    }

    const dashboard = item && item.value;
    const allDashboardIds = _($scope.dashboardGroup.dashboards).pluck('id');

    if (!dashboard) {
      return allDashboardIds.value();
    }

    let toRemove = false;
    _.each(allDashboardsGroups, function (group) {
      _.each(group.dashboards,function (dash) {
        if (dash.id === dashboard) {
          toRemove = true;
          return false;
        }
      });
      if (toRemove) {
        return false;
      }
    });

    return toRemove || allDashboardIds.compact().contains(dashboard);
  };

  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.saveObject = function () {
    dashboardGroup.save()
    .then(function (groupId) {
      notify.info('Dashboard Group ' + dashboardGroup.title + ' was successfuly saved');
      $rootScope.$emit('kibi:dashboardgroup:changed', groupId);
      kbnUrl.change(`management/kibana/dashboardgroups/${groupId}`);
    });
  };

  $scope.newObject = function () {
    kbnUrl.change('management/kibana/dashboardgroups', {});
  };

  function getNumberOfDashboards() {
    return savedDashboards.find().then(function (data) {
      $scope.nbDashboards = data.hits ? data.hits.length : 0;
    });
  }
  $scope.nbDashboards = 0;
  getNumberOfDashboards();

  function addTitle(dashboards) {
    const promises = _(dashboards).filter(function (d) {
      return !!d.id && !d.title;
    }).map(function (d) {
      return savedDashboards.get(d.id);
    }).value();

    if (promises.length === 0) {
      return;
    }
    Promise.all(promises).then(function (dashboards, index) {
      _.each(dashboards, function (dashboard) {
        _.find($scope.dashboardGroup.dashboards, 'id', dashboard.id).title = dashboard.title;
      });
    });
  }

  $scope.$watch('dashboardGroup.dashboards', function (dashboards) {
    if (dashboards) {
      addTitle(dashboards);
    }
  }, true);
}

uiModules
.get('apps/management', ['kibana'])
.controller('DashboardGroupsEditor', controller);
