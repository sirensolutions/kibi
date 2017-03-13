define(function (require) {
  return function DiffTimePickerValuesFn($rootScope) {
    let _ = require('lodash');
    let angular = require('angular');
    let dateMath = require('ui/utils/dateMath');

    let valueOf = function (o) {
      if (o) return o.valueOf();
    };

    return function (rangeA, rangeB) {
      if (_.isObject(rangeA) && _.isObject(rangeB)) {
        // kibi: support the time precision when comparing times
        dateMath.roundWithPrecision(rangeA.to, $rootScope.kibiTimePrecision);
        dateMath.roundWithPrecision(rangeB.to, $rootScope.kibiTimePrecision);
        dateMath.roundWithPrecision(rangeA.from, $rootScope.kibiTimePrecision);
        dateMath.roundWithPrecision(rangeB.from, $rootScope.kibiTimePrecision);
        // kibi: end

        if (
          valueOf(rangeA.to) !== valueOf(rangeB.to)
          || valueOf(rangeA.from) !== valueOf(rangeB.from)
          || valueOf(rangeA.value) !== valueOf(rangeB.value)
          || valueOf(rangeA.pause) !== valueOf(rangeB.pause)
        ) {
          return true;
        }
      } else {
        return !angular.equals(rangeA, rangeB);
      }

      return false;
    };
  };
});
