define(function (require) {
  return function KibanaControllerInit($rootScope, $scope, $location, courier, $http, globalState, notify, config, Notifier) {
    // expose some globals
    $rootScope.globalState = globalState;

    // and some local values
    $scope.appEmbedded = $location.search().embed || false;
    $scope.embedAllDashboards = $scope.appEmbedded && $location.search().embedAllDashboards || false;
    $scope.httpActive = $http.pendingRequests;
    $scope.notifList = notify._notifs;

    // added by kibi
    var updateAwesomeMode = function () {
      $scope.awesomeDemoMode = config.get('kibi:awesomeDemoMode');
    };
    updateAwesomeMode();
    $rootScope.$on('change:config.kibi:awesomeDemoMode', updateAwesomeMode);

    var updateZoom = function () {
      var zoom = config.get('kibi:zoom');
      var zoomNumber = 1;
      try {
        zoomNumber = parseFloat(zoom);
      } catch (e) {
        delete $scope.st_zoom_style;
        notify.warning('Zoom set to [' + zoom + '] while it should be float in range (0, 1>');
        return;
      }

      if (zoomNumber <= 1 && zoomNumber > 0) {
        $scope.st_zoom_style = {
          zoom: zoomNumber
        };
      } else {
        delete $scope.st_zoom_style;
        notify.warning('Zoom set to [' + zoom + '] while it should be float in range (0, 1>');
      }
    };
    updateZoom();
    $rootScope.$on('change:config.kibi:zoom', updateZoom);
    // kibi end

    // wait for the application to finish loading
    $scope.$on('application.load', function () {
      courier.start();
    });
  };
});
