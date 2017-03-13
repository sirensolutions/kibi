define(function (require) {
  let datemath = require('ui/utils/dateMath');
  let _ = require('lodash');
  let ConfigTemplate = require('ui/ConfigTemplate');

  require('ui/modules')
  .get('kibana')
  // TODO: / Kibi / all of this really belongs in the timepicker
  .directive('chromeContext', function (timefilter, globalState, $rootScope, createNotifier, config) {

    let listenForUpdates = _.once(function ($scope) {
      $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
        globalState.time = _.clone(timefilter.time);
        globalState.refreshInterval = _.clone(timefilter.refreshInterval);
        globalState.save();
      });
    });

    var notify = createNotifier({
      location: 'Chrome component'
    });

    return {
      link: function ($scope) {
        listenForUpdates($scope);

        var updateTimePrecision = function () {
          var p = config.get('kibi:timePrecision');
          if (p && datemath.units.indexOf(p) === -1) {
            notify.error('kibi:timePrecision valid values are: ' + datemath.units);
          } else {
            $scope.kibiTimePrecision = p;
          }
        };

        updateTimePrecision();
        $rootScope.$on('init:config', updateTimePrecision);
        $rootScope.$on('change:config.kibi:timePrecision', updateTimePrecision);
        // kibi end

        // chrome is responsible for timepicker ui and state transfer...
        $scope.timefilter = timefilter;
        $scope.pickerTemplate = new ConfigTemplate({
          filter: require('ui/chrome/config/filter.html'),
          interval: require('ui/chrome/config/interval.html')
        });

        $scope.toggleRefresh = function () {
          timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
        };
      }
    };
  });

});
