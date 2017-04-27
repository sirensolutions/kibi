import 'fontawesome-iconpicker';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.directive('iconPicker', function ($window) {
  return {
    restrict: 'A',
    scope: {
      ngModel: '='
    },
    link($scope, $element, attrs) {
      $element.iconpicker({
        inputSearch: true,
        hideOnSelect: true
      });
      $element.on('click focus', () => {
        if (!$window.getSelection().toString()) {
          $element.select();
        }
      });
      $scope.$watch('ngModel', (newVal, oldVal) => {
        if (newVal !== oldVal) {
          const selected = newVal.replace(/^fa\s/i, '');
          $element.data('iconpicker').setSourceValue(selected.toLowerCase());
        }
      });
      $element.on('iconpickerSelect', (item) => {
        $scope.$apply(() => {
          $scope.ngModel = `fa ${ item.iconpickerItem.data().iconpickerValue }`;
        });
      });
      $scope.$on('$destroy', () => {
        $element.data('iconpicker').destroy();
      });
    }
  };
});
