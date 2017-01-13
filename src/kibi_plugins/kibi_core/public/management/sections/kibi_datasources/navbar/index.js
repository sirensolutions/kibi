import registry from 'ui/registry/navbar_extensions';
import angular from 'angular';
import openTemplate from './load_datasource.html';

function hideButton(path) {
  return !path.startsWith('/management/kibana/datasources');
}

registry.register(function () {
  return {
    appName: 'management-subnav',
    key: 'new datasource',
    order: 1,
    run() {
      angular.element(document.getElementById('datasources_editor')).scope().newDatasource();
    },
    hideButton,
    testId: 'new-datasource'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'save datasource',
    order: 2,
    run() {
      angular.element(document.getElementById('datasources_editor')).scope().submit();
    },
    disableButton() {
      return !angular.element(document.getElementById('datasources_editor')).scope().isValid();
    },
    hideButton,
    testId: 'save-datasource'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'open datasource',
    order: 3,
    template: openTemplate,
    controller($scope) {
      $scope.makeUrl = function (hit) {
        return `#/management/kibana/datasources/${hit.id}`;
      };
    },
    hideButton,
    testId: 'open-datasource'
  };
});
