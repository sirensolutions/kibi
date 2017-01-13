import registry from 'ui/registry/navbar_extensions';
import angular from 'angular';

function hideButton(path) {
  return !path.startsWith('/management/kibana/relations');
}

registry.register(function () {
  return {
    appName: 'management-subnav',
    key: 'save relations',
    order: 2,
    run() {
      angular.element(document.getElementById('relations')).scope().submit();
    },
    disableButton() {
      return !angular.element(document.getElementById('relations')).scope().isObjectValid();
    },
    hideButton,
    testId: 'save-relations'
  };
});
