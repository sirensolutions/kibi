import uiModules from 'ui/modules';
import { isNumber } from 'lodash';
import { KibiHumanReadableHelperProvider } from './kibi_human_readable_helper';

uiModules
.get('kibana')
.directive('kibiHumanReadableNumber', function (Private) {
  const kibiHumanReadableHelper = Private(KibiHumanReadableHelperProvider);
  return {
    restrict: 'E',
    scope: {
      value: '=?',
      format: '@'
    },
    replace: true,
    template: '<span>{{formatted}}</span>',
    link: function ($scope, $element, $attrs) {
      const format = $scope.format || '0,000';

      $scope.$watch('value', function (value) {
        if (value !== undefined) {
          if (isNumber(value)) {
            $scope.formatted = kibiHumanReadableHelper.formatNumber(value, format);
          } else {
            $scope.formatted = value;
          }
        }
      });
    }
  };
});
