import registry from 'ui/registry/navbar_extensions';
import angular from 'angular';
import openTemplate from './load_query.html';

function hideButton(path) {
  return !path.startsWith('/management/kibana/queries');
}

registry.register(function () {
  return {
    appName: 'management-subnav',
    key: 'new query',
    order: 1,
    run() {
      angular.element(document.getElementById('queries_editor')).scope().newQuery();
    },
    hideButton,
    testId: 'new-query'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'save query',
    order: 2,
    run() {
      angular.element(document.getElementById('queries_editor')).scope().submit();
    },
    disableButton() {
      return !angular.element(document.getElementById('queries_editor')).scope().isValid();
    },
    hideButton,
    testId: 'save-query'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'open query',
    order: 3,
    template: openTemplate,
    hideButton,
    controller($scope) {
      $scope.makeUrl = function (hit) {
        return `#/management/kibana/queries/${hit.id}`;
      };
    },
    testId: 'open-query'
  };
});
