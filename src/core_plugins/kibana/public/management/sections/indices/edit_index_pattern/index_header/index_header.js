import { uiModules } from 'ui/modules';
import template from './index_header.html';
import './index_header.less';
uiModules
.get('apps/management')
.directive('kbnManagementIndexHeader', function ($injector, config) {
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
      // Kibi: added getSelectedTab to get the active tab
      getSelectedTab:  '='
    },
    link: function ($scope, $el, attrs) {
      $scope.delete = attrs.delete ? $scope.delete : null;
      // kibi: added save to enable saving of changes
      $scope.save = attrs.save ? $scope.save : null;
      $scope.isSaveDisabled = attrs.isSaveDisabled ? $scope.isSaveDisabled : null;
      $scope.setDefault = attrs.setDefault ? $scope.setDefault : null;
      $scope.refreshFields = attrs.refreshFields ? $scope.refreshFields : null;
      config.bindToScope($scope, 'defaultIndex');

      // Kibi: added to handle the tabs (index details and relational graph)
      $scope.selectedTab = 'details';
      $scope.getSelectedTab($scope.selectedTab);
      const isRelationalGraphAvailable = $injector.has('sirenRelationalGraphDirective');

      $scope.changeSelectedTab = (tabName) => {
        if (!isRelationalGraphAvailable && tabName === 'graph') {
          notify.warning('Siren Relational Graph not available, please install the Siren Graph Browser');
        } else {
          $scope.selectedTab = tabName;
          $scope.getSelectedTab(tabName);
        }
      };
    }
  };
});
