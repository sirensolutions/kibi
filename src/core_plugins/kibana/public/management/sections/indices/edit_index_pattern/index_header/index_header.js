import { uiModules } from 'ui/modules';
import template from './index_header.html';
import './index_header.less';
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
      // kibi: indexPattern property replaced by entity, added save function
      entity: '=',
      save: '&',
      isSaveDisabled: '&',
      toggleGraph: '&'
    },
    link: function ($scope, $el, attrs) {
      $scope.delete = attrs.delete ? $scope.delete : null;
      // kibi: added save to enable saving of changes
      $scope.save = attrs.save ? $scope.save : null;
      $scope.isSaveDisabled = attrs.isSaveDisabled ? $scope.isSaveDisabled : null;
      // kibi: added toggleGraph to enable/disable the relational graph
      $scope.toggleGraph = attrs.toggleGraph ? $scope.toggleGraph : null;
      $scope.setDefault = attrs.setDefault ? $scope.setDefault : null;
      $scope.refreshFields = attrs.refreshFields ? $scope.refreshFields : null;
      config.bindToScope($scope, 'defaultIndex');
    }
  };
});
