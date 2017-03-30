import uiModules from 'ui/modules';
import { throttle } from 'lodash';
import { unhashUrl, getUnhashableStatesProvider } from 'ui/state_management/state_hashing';

uiModules.get('kibana')
.directive('share', function (Private, $timeout, $location, config, getAppState, globalState, kibiState) {

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
      const urlShortener = Private(require('./lib/url_shortener'));
      const getUnhashableStates = Private(getUnhashableStatesProvider);

      const setUrl = throttle(() => {
        const urlWithHashes = $location.absUrl();
        let url = urlWithHashes;
        if (!config.get('state:storeInSessionStorage')) {
          url = unhashUrl(urlWithHashes, getUnhashableStates());
        }
        $scope.url = urlShortener.shortenUrl(url);
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
