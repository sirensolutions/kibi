define(function (require) {

  require('ui/modules')
  .get('kibana')
  .directive('kibiValidate', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, elm, attrs, ctrl) {
        if (attrs.kibiValidate === 'integer') {
          var INTEGER_REGEXP = /^\-?\d+$/;
          ctrl.$validators.integer = function (modelValue, viewValue) {
            if (ctrl.$isEmpty(modelValue)) {
              // consider empty models to be valid
              return true;
            }
            return INTEGER_REGEXP.test(viewValue);
          };
        }
        if (attrs.kibiValidate === 'positive-integer-or-minus-one') {
          var POSITIVE_INT_REGEXP = /^\d+$/;
          ctrl.$validators.positiveintegerorminusone = function (modelValue, viewValue) {
            if (ctrl.$isEmpty(modelValue)) {
              // consider empty models to be valid
              return true;
            }
            return viewValue !== '0' && (POSITIVE_INT_REGEXP.test(viewValue) || viewValue === '-1');
          };
        }
      }
    };
  });
});
