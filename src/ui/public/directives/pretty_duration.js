import _ from 'lodash';
import moment from 'moment';
import 'ui/timepicker/quick_ranges';
import 'ui/timepicker/time_units';
import 'ui/kibi/styles/kibi.less'; // kibi: added some styling
import uiModules from 'ui/modules';
const module = uiModules.get('kibana');

// kibi: imports
import { parseWithPrecision } from 'ui/kibi/utils/date_math_precision';

module.directive('prettyDuration', function (config, quickRanges, timeUnits) {
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '='
    },
    link: function ($scope, $elem) {
      // kibi: support time precision modification everywhere when parseWithPrecision method is used
      const dateFormat = config.get('dateFormat');

      const lookupByRange = {};
      _.each(quickRanges, function (frame) {
        lookupByRange[frame.from + ' to ' + frame.to] = frame;
      });

      function stringify() {
        let text;

        $elem.removeClass('cant-lookup'); // kibi: added to make the tests pass when the text is taken from the absolute timerange
        // If both parts are date math, try to look up a reasonable string
        if ($scope.from && $scope.to && !moment.isMoment($scope.from) && !moment.isMoment($scope.to)) {
          const tryLookup = lookupByRange[$scope.from.toString() + ' to ' + $scope.to.toString()];
          if (tryLookup) {
            $elem.text(tryLookup.display);
          } else {
            const fromParts = $scope.from.toString().split('-');
            if ($scope.to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
              const rounded = fromParts[1].split('/');
              text = 'Last ' + rounded[0];
              if (rounded[1]) {
                text = text + ' rounded to the ' + timeUnits[rounded[1]];
              }
              $elem.text(text);
            } else {
              cantLookup();
            }
          }
        // If at least one part is a moment, try to make pretty strings by parsing date math
        } else {
          cantLookup();
        }
      };

      function cantLookup() {
        const display = {};

        $elem.addClass('cant-lookup'); // kibi: add the class back
        _.each(['from', 'to'], function (time) {
          if (moment.isMoment($scope[time])) {
            display[time] = $scope[time].format(dateFormat);
          } else {
            if ($scope[time] === 'now') {
              display[time] = 'now';
            } else {
              const tryParse = parseWithPrecision($scope[time], time === 'to' ? true : false, $scope.kibiTimePrecision);
              display[time] = moment.isMoment(tryParse) ? '~ ' + tryParse.fromNow() : $scope[time];
            }
          }
        });
        $elem.text(display.from + ' to ' + display.to);
      };

      $scope.$watch('from', stringify);
      $scope.$watch('to', stringify);

    }
  };
});

