define(function (require) {
  return function KbnControllerApps(Private, $rootScope, $scope, $location, globalState, sessionStorage) {
    var _ = require('lodash');
    var urlHelper   = Private(require('components/kibi/url_helper/url_helper'));

    function appKey(app) {
      return 'lastPath:' + app.id;
    }

    function assignPaths(app) {
      app.rootPath = '/' + app.id;
      app.lastPath = sessionStorage.get(appKey(app)) || app.rootPath;

      // added by kibi
      // make sure that the first time user opens the app
      // and click dashboard he will see the
      // the default_dashboard_id or first dashboard if there is any
      urlHelper.getInitialPath(app).then(function (path) {
        setLastPath(app, path);
      });
      // kibi end
    }

    function getShow(app) {
      app.show = app.order >= 0 ? true : false;
    }

    function setLastPath(app, path) {
      app.lastPath = path;
      return sessionStorage.set(appKey(app), path);
    }

    $scope.apps = Private(require('registry/apps'));
    // initialize each apps lastPath (fetch it from storage)
    $scope.apps.forEach(assignPaths);
    $scope.apps.forEach(getShow);


    function onRouteChange() {
      var route = $location.path().split(/\//);
      $scope.apps.forEach(function (app) {
        if (app.active = app.id === route[1]) {
          $rootScope.activeApp = app;
        }
      });

      if (!$rootScope.activeApp || $scope.appEmbedded) return;

      // Record the last URL w/ state of the app, use for tab.
      setLastPath($rootScope.activeApp, globalState.removeFromUrl($location.url()));
    }

    $rootScope.$on('$routeChangeSuccess', onRouteChange);
    $rootScope.$on('$routeUpdate', onRouteChange);
  };
});
