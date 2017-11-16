import { uiModules } from 'ui/modules';
import template from './index_header.html';
uiModules
.get('apps/management')
.directive('kbnManagementIndexHeader', function (config) {
  return {
    restrict: 'E',
    template,
    replace: true,
    scope: {
      setDefault: '&',
      refreshFields: '&',
      delete: '&',
      // kibi: changed indexpattern to entity and added save function
      entity: '=',
      save: '&'
    },
    link: function ($scope, $el, attrs) {
      $scope.delete = attrs.delete ? $scope.delete : null;
      // kibi: added save to enable saving of changes
      $scope.save = attrs.save ? $scope.save : null;
      $scope.setDefault = attrs.setDefault ? $scope.setDefault : null;
      $scope.refreshFields = attrs.refreshFields ? $scope.refreshFields : null;
      config.bindToScope($scope, 'defaultIndex');
    }
  };
});
