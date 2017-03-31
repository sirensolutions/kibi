import uiModules from 'ui/modules';
import { throttle } from 'lodash';

uiModules.get('kibana')
.directive('share', function (Private, $timeout, $location, getAppState, globalState, kibiState, sharingService) {

  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectTypePlural: '@', // kibi: added as we have share all option
      objectId: '@',
      setAllowEmbed: '&?allowEmbed'
    },
    template: require('ui/share/views/share.html'),
    controller: function ($scope) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;

      // siren: generate shortened url automatically and set it on the scope
      // throttle to avoid creating multiple urls when states are changing
      const setUrl = throttle(() => {
        sharingService.generateShortUrl().then(url => $scope.url = url);
      }, 250);

      setUrl();

      const appState = getAppState();
      appState.on('save_with_changes', function () {
        setUrl();
      });
      globalState.on('save_with_changes', function () {
        setUrl();
      });
      kibiState.on('save_with_changes', function () {
        setUrl();
      });
      // siren: end

    }
  };
});
