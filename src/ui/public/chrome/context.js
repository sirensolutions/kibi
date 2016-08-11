define(function (require) {
  var datemath = require('ui/utils/dateMath');
  var _ = require('lodash');
  var ConfigTemplate = require('ui/ConfigTemplate');

  require('ui/modules')
  .get('kibana')
  // TODO: / Kibi / all of this really belongs in the timepicker
  .directive('chromeContext', function (timefilter, globalState, $rootScope, createNotifier, config) {

    var listenForUpdates = _.once(function ($scope) {
      $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
        globalState.time = _.clone(timefilter.time);
        globalState.refreshInterval = _.clone(timefilter.refreshInterval);
        globalState.save();
      });
    });

    // kibi: added so we can notify in case there is a problem with setting kibi:zoom
    var notify = createNotifier({
      location: 'Chrome component'
    });
    // kibi: end

    return {
      link: function ($scope) {
        listenForUpdates($scope);

        // kibi: set kibi_zoom_style and time precision
        var updateZoom = function () {
          var zoom = config.get('kibi:zoom');
          var zoomNumber = 1;
          try {
            zoomNumber = parseFloat(zoom);
          } catch (e) {
            delete $scope.kibi_zoom_style;
            notify.warning('Zoom set to [' + zoom + '] while it should be float in range (0, 1>');
            return;
          }

          if (zoomNumber <= 1 && zoomNumber > 0) {
            $scope.kibi_zoom_style = {
              zoom: zoomNumber
            };
          } else {
            delete $scope.kibi_zoom_style;
            notify.warning('Zoom set to [' + zoom + '] while it should be float in range (0, 1>');
          }
        };
        $rootScope.$on('init:config', updateZoom);
        $rootScope.$on('change:config.kibi:zoom', updateZoom);

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
