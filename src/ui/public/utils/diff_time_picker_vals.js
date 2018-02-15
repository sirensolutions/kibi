import _ from 'lodash';
import angular from 'angular';
// kibi: imports
import { roundWithPrecision } from 'ui/kibi/utils/date_math_precision';

export function UtilsDiffTimePickerValsProvider($rootScope) {

  const valueOf = function (o) {
    if (o) return o.valueOf();
  };

  return function (rangeA, rangeB) {
    if (_.isObject(rangeA) && _.isObject(rangeB)) {
      // kibi: support the time precision when comparing times
      roundWithPrecision(rangeA.to, $rootScope.sirenTimePrecision);
      roundWithPrecision(rangeB.to, $rootScope.sirenTimePrecision);
      roundWithPrecision(rangeA.from, $rootScope.sirenTimePrecision);
      roundWithPrecision(rangeB.from, $rootScope.sirenTimePrecision);
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
}
