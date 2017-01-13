import registry from 'ui/registry/navbar_extensions';
import angular from 'angular';
import openTemplate from './load_template.html';

function hideButton(path) {
  return !path.startsWith('/management/kibana/templates');
}

registry.register(function () {
  return {
    appName: 'management-subnav',
    key: 'new template',
    order: 1,
    run() {
      angular.element(document.getElementById('templates_editor')).scope().newTemplate();
    },
    hideButton,
    testId: 'new-template'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'save template',
    order: 2,
    run() {
      angular.element(document.getElementById('templates_editor')).scope().submit();
    },
    disableButton() {
      return !angular.element(document.getElementById('templates_editor')).scope().isValid();
    },
    hideButton,
    testId: 'save-template'
  };
})
.register(function () {
  return {
    appName: 'management-subnav',
    key: 'open template',
    order: 3,
    template: openTemplate,
    hideButton,
    controller($scope) {
      $scope.makeUrl = function (hit) {
        return `#/management/kibana/templates/${hit.id}`;
      };
    },
    testId: 'open-template'
  };
});
