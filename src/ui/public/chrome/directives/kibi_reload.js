import UiModules from 'ui/modules';

UiModules
.get('kibana')
.directive('kibiReload', function ($timeout, $window) {
  return {
    restrict: 'A',
    link: function (scope, element, attr) {
      element.bind('click', function (e) {
        e.stopPropagation();

        // to force reload put kibi-reload="true" in the html
        const forcedReload = new Boolean(attr.kibiReload);
        const newWindow = $window.open($window.location.origin + '/app/kibana#/?clearSirenSession=true');
        if (newWindow) {
          // NOTE: without this little wait firefox will end up with blank window
          $timeout(() => {
            newWindow.location.reload(forcedReload);
          }, 100);
        }
      });
    }
  };
});
