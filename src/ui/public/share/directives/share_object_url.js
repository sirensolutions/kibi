const app = require('ui/modules').get('kibana');
const Clipboard = require('clipboard');
const unhashUrl = require('ui/state_management/state_hashing').unhashUrl;
const getUnhashableStatesProvider = require('ui/state_management/state_hashing').getUnhashableStatesProvider;

require('../styles/index.less');

app.directive('shareObjectUrl', function (Private, createNotifier) {
  const urlShortener = Private(require('../lib/url_shortener'));
  const getUnhashableStates = Private(getUnhashableStatesProvider);

  return {
    restrict: 'E',
    scope: {
      getShareAsEmbed: '&shareAsEmbed',
      isKibiNavbarVisible:'&kibiNavbarVisible' // kibi: added to control when to show hide kibi-nav-bar
    },
    template: require('ui/share/views/share_object_url.html'),
    link: function ($scope, $el) {
      const notify = createNotifier({
        location: `Share ${$scope.$parent.objectType}`
      });

      $scope.textbox = $el.find('input.url')[0];
      $scope.clipboardButton = $el.find('button.clipboard-button')[0];

      const clipboard = new Clipboard($scope.clipboardButton, {
        target(trigger) {
          return $scope.textbox;
        }
      });

      clipboard.on('success', e => {
        notify.info('URL copied to clipboard.');
        e.clearSelection();
      });

      clipboard.on('error', () => {
        notify.info('URL selected. Press Ctrl+C to copy.');
      });

      $scope.$on('$destroy', () => {
        clipboard.destroy();
      });

      $scope.clipboard = clipboard;
    },
    controller: function ($scope, $location) {
      const notify = createNotifier({
        location: `Share ${$scope.$parent.objectType}`
      });

      function updateUrl(url) {
        $scope.url = url;

        if ($scope.shareAsEmbed) {
          $scope.formattedUrl = `<iframe src="${$scope.url}" height="600" width="800"></iframe>`;
        } else {
          $scope.formattedUrl = $scope.url;
        }

        $scope.shortGenerated = false;
      }

      $scope.shareAsEmbed = $scope.getShareAsEmbed();
      $scope.kibiNavbarVisible = $scope.isKibiNavbarVisible(); // kibi: added to control when to show hide kibi-nav-bar

      $scope.generateShortUrl = function () {
        if ($scope.shortGenerated) return;

        urlShortener.shortenUrl($scope.url)
        .then(shortUrl => {
          updateUrl(shortUrl);
          $scope.shortGenerated = true;
        });
      };

      $scope.getUrl = function () {
        const urlWithHashes = $location.absUrl();
        let urlWithStates = unhashUrl(urlWithHashes, getUnhashableStates());

        // kibi: add/replace session id with the detached one
        urlWithStates = urlWithStates.replace(`s:${$scope.$parent.currentSessionId}`, `s:${$scope.$parent.sharedSessionId}`);
        if ($scope.shareAsEmbed) {
          // kibi: added to control when to show hide kibi-nav-bar
          if ($scope.kibiNavbarVisible) {
            urlWithStates = urlWithStates.replace('?', '?embed=true&kibiNavbarVisible=true&');
          } else {
            urlWithStates = urlWithStates.replace('?', '?embed=true&');
          }
          // kibi: end
        }

        return urlWithStates;
      };

      $scope.$watch('getUrl()', updateUrl);
    }
  };
});
