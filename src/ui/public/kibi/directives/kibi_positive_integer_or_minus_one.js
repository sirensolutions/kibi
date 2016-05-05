define(function (require) {

  // test if value is a positive integer or -1
  require('ui/modules')
  .get('kibana')
  .directive('kibiPositiveIntegerOrMinusOne', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, element, attrs, ctrl) {
        ctrl.$parsers.unshift(function (value) {
          var INTREGEXP = /^\d+$/;
          if (value !== '0' && (INTREGEXP.test(value) || value === '-1')) {
            ctrl.$setValidity('kibiPositiveIntegerOrMinusOne', true);
          } else {
            ctrl.$setValidity('kibiPositiveIntegerOrMinusOne', false);
          }
          return value;
        });
      }
    };
  });
});
