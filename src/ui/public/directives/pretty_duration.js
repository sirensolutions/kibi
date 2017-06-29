define(function (require) {
  let module = require('ui/modules').get('kibana');
  let _ = require('lodash');
  let dateMath = require('ui/utils/dateMath');
  let moment = require('moment');

  require('ui/timepicker/quick_ranges');
  require('ui/timepicker/time_units');
  require('ui/kibi/styles/kibi.less'); // kibi: added some styling

  module.directive('prettyDuration', function (config, quickRanges, timeUnits) {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '=',
        mode: '='
      },
      link: function ($scope, $elem) {
        // kibi: support time precision modification everywhere when parseWithPrecision method is used
        let splitTemplate = _.template('<span class="from"><%= from %></span>' +
          '<span class="separator"><%= separator %></span>' +
          '<span class="to"><%= to %></span>');
        let dateFormat = config.get('dateFormat');

        let lookupByRange = {};
        _.each(quickRanges, function (frame) {
          lookupByRange[frame.from + ' to ' + frame.to] = frame;
        });

        function stringify() {
          let text;

          $elem.removeClass('cant-lookup'); // kibi: added to make the tests pass when the text is taken from the absolute timerange
          // If both parts are date math, try to look up a reasonable string
          if ($scope.from && $scope.to && !moment.isMoment($scope.from) && !moment.isMoment($scope.to)) {
            let tryLookup = lookupByRange[$scope.from.toString() + ' to ' + $scope.to.toString()];
            if (tryLookup) {
              $elem.text(tryLookup.display);
            } else {
              let fromParts = $scope.from.toString().split('-');
              if ($scope.to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
                let rounded = fromParts[1].split('/');
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
          let display = {};

          $elem.addClass('cant-lookup'); // kibi: add the class back
          _.each(['from', 'to'], function (time) {
            if (moment.isMoment($scope[time])) {
              display[time] = $scope[time].format(dateFormat);
            } else {
              if ($scope[time] === 'now') {
                display[time] = 'now';
              } else {
                let tryParse = dateMath.parseWithPrecision($scope[time], time === 'to' ? true : false, $scope.kibiTimePrecision);

                // kibi: disable shortening when time is absolute
                const formattedDate = moment($scope[time]).format(dateFormat);
                display[time] = (moment.isMoment(tryParse)  && $scope.mode !== 'absolute') ? '~ ' + tryParse.fromNow() : formattedDate;
              }
            }
          });
          $elem.html(splitTemplate({
            from: display.from,
            separator: ' to ',
            to: display.to
          }));

        };

        $scope.$watch('from', stringify);
        $scope.$watch('to', stringify);

      }
    };
  });

});
