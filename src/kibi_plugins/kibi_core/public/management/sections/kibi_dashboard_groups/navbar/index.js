import registry from 'ui/registry/navbar_extensions';
import angular from 'angular';
import openTemplate from './load_dashboard_group.html';

function hideButton(path) {
  return !path.startsWith('/management/kibana/dashboardgroups');
}

registry.register(function () {
  return {
    appName: 'management-subnav',
    key: 'new dashboard group',
    order: 1,
    run() {
      angular.element(document.getElementById('dashboard_groups_editor')).scope().newDashboardGroup();
    },
    hideButton,
    testId: 'new-dashboard-group'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'save dashboard group',
    order: 2,
    run() {
      angular.element(document.getElementById('dashboard_groups_editor')).scope().submit();
    },
    disableButton() {
      return !angular.element(document.getElementById('dashboard_groups_editor')).scope().isValid();
    },
    hideButton,
    testId: 'save-dashboard-group'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'open dashboard group',
    order: 3,
    template: openTemplate,
    hideButton,
    controller($scope) {
      $scope.makeUrl = function (hit) {
        return `#/management/kibana/dashboardgroups/${hit.id}`;
      };
    },
    testId: 'open-dashboard-group'
  };
});
