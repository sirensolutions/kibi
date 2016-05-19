define(function (require) {
  var module = require('ui/modules').get('kibana');
  var _ = require('lodash');
  var dateMath = require('ui/utils/dateMath');
  var moment = require('moment');

  require('ui/timepicker/quick_ranges');
  require('ui/timepicker/time_units');
  require('ui/kibi/styles/kibi.less'); // kibi: added some styling to


  module.directive('prettyDuration', function (config, quickRanges, timeUnits) {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '='
      },
      link: function ($scope, $elem) {
        // kibi: support time precision modification everywhere when parseWithPrecision method is used
        var splitTemplate = _.template('<span class="from"><%= from %></span>' +
          '<span class="separator"><%= separator %></span>' +
          '<span class="to"><%= to %></span>');
        var dateFormat = config.get('dateFormat');

        var lookupByRange = {};
        _.each(quickRanges, function (frame) {
          lookupByRange[frame.from + ' to ' + frame.to] = frame;
        });

        function stringify() {
          var text;

          $elem.removeClass('cant-lookup');
          // If both parts are date math, try to look up a reasonable string
          if ($scope.from && $scope.to && !moment.isMoment($scope.from) && !moment.isMoment($scope.to)) {
            var tryLookup = lookupByRange[$scope.from.toString() + ' to ' + $scope.to.toString()];
            if (tryLookup) {
              $elem.text(tryLookup.display);
            } else {
              var fromParts = $scope.from.toString().split('-');
              if ($scope.to.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
                var rounded = fromParts[1].split('/');
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
          var display = {};

          $elem.addClass('cant-lookup');
          _.each(['from', 'to'], function (time) {
            if (moment.isMoment($scope[time])) {
              display[time] = $scope[time].format(dateFormat);
            } else {
              if ($scope[time] === 'now') {
                display[time] = 'now';
              } else {
                var tryParse = dateMath.parseWithPrecision($scope[time], time === 'to' ? true : false, $scope.kibiTimePrecision);

                display[time] = moment.isMoment(tryParse) ? '~ ' + tryParse.fromNow() : $scope[time];
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
